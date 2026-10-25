mod claude;
mod endpoint;
mod models;
mod ollama;
mod openai;
mod probe;
mod prompt;
mod sse;

use crate::models::{ConversationTurn, ProviderKind, ProviderProfile};
use std::sync::{atomic::AtomicBool, Arc};

/// Provider-neutral inputs for one streamed translation. Grouping them keeps
/// the adapter signatures readable as fields are added.
pub(crate) struct StreamRequest<'a> {
    pub client: &'a reqwest::Client,
    pub profile: &'a ProviderProfile,
    pub key: &'a str,
    pub system: &'a str,
    pub history: &'a [ConversationTurn],
    pub prompt: &'a str,
}

pub async fn stream_translation<F>(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    api_key: &str,
    history: &[ConversationTurn],
    user_prompt: &str,
    cancel: Arc<AtomicBool>,
    on_delta: F,
) -> Result<(), String>
where
    F: FnMut(String) + Send,
{
    if !matches!(profile.kind, ProviderKind::Ollama) {
        endpoint::validate(&profile.base_url)?;
    }
    let request = StreamRequest {
        client,
        profile,
        key: api_key,
        system: if is_translategemma(profile) {
            ""
        } else {
            prompt::system_prompt()
        },
        history,
        prompt: user_prompt,
    };
    match profile.kind {
        ProviderKind::Openai => openai::stream(request, cancel, on_delta).await,
        ProviderKind::Claude => claude::stream(request, cancel, on_delta).await,
        ProviderKind::Ollama => ollama::stream(request, cancel, on_delta).await,
    }
}

/// One minimal non-streaming request, used by the Settings connectivity check.
/// Any token the endpoint returns is discarded; only reachability matters.
pub async fn probe(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    api_key: &str,
) -> Result<(), String> {
    if !matches!(profile.kind, ProviderKind::Ollama) {
        endpoint::validate(&profile.base_url)?;
    }
    match profile.kind {
        ProviderKind::Openai => openai::probe(client, profile, api_key).await,
        ProviderKind::Claude => claude::probe(client, profile, api_key).await,
        ProviderKind::Ollama => ollama::probe(client, profile).await,
    }
}

pub async fn list_models(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    api_key: &str,
) -> Result<Vec<String>, String> {
    if matches!(profile.kind, ProviderKind::Ollama) {
        ollama::list(client).await
    } else {
        endpoint::validate(&profile.base_url)?;
        models::list(client, profile, api_key).await
    }
}

pub fn is_lan_endpoint(value: &str) -> bool {
    endpoint::is_lan(value)
}

pub fn is_translategemma(profile: &ProviderProfile) -> bool {
    (matches!(profile.kind, ProviderKind::Ollama)
        || profile.base_url.starts_with("http://127.0.0.1:11434/"))
        && profile.model.starts_with("translategemma:")
}

/// Small local models follow a plain-text instruction more reliably than the
/// language-marker protocol used for remote APIs.
pub fn build_local_prompt(
    source: &str,
    target: &str,
    style: &str,
    custom: &str,
    text: &str,
) -> String {
    let from = if source == "Auto Detect" {
        "".to_owned()
    } else {
        format!(" from {source}")
    };
    let extra = if custom.trim().is_empty() {
        String::new()
    } else {
        format!(" {}", custom.trim())
    };
    format!("Translate the text{from} into {target} in a {style} style.{extra} Return only the translation, with no label, explanation, or JSON.\n\n{text}")
}

/// Shared verdict for both adapters' probes. A model that refuses the one-token
/// budget still proves the endpoint, model name and credential are usable.
pub use probe::redact;

pub fn build_user_prompt(
    source: &str,
    target: &str,
    style: &str,
    custom: &str,
    text: &str,
) -> String {
    format!("Translate from {source} to {target}. Style: {style}. Additional requirements: {}. Detect the actual source language. First output exactly [[LANGUAGE:language name]] on its own line, then only the translation. Text:\n{text}", if custom.trim().is_empty() { "none" } else { custom })
}

/// TranslateGemma follows its own single-message translation prompt and
/// returns translation text directly, without Verva's language marker.
pub fn build_translategemma_prompt(
    source: &str,
    target: &str,
    style: &str,
    custom: &str,
    text: &str,
) -> String {
    let source = if source == "Auto Detect" {
        "the detected source language"
    } else {
        source
    };
    let requirements = if custom.trim().is_empty() {
        String::new()
    } else {
        format!(" Keep this additional requirement: {}.", custom.trim())
    };
    format!("You are a professional {source} to {target} translator. Accurately convey the meaning and nuances of the original text while following {target} grammar and cultural conventions. Use a {style} style.{requirements} Produce only the {target} translation, without explanations or commentary. Translate the following text:\n\n{text}")
}

#[cfg(test)]
mod mock;

#[cfg(test)]
mod stream_tests {
    use super::mock::MockProvider;
    use super::*;
    use crate::models::{ProviderKind, ProviderProfile};
    use std::sync::atomic::Ordering;
    use std::time::Duration;

    fn profile(base_url: String) -> ProviderProfile {
        ProviderProfile {
            id: "test-profile".into(),
            kind: ProviderKind::Openai,
            base_url,
            model: "mock-model".into(),
            thinking: crate::models::ThinkingLevel::Off,
            long_conversation: false,
            context_limit: 128_000,
        }
    }

    fn deltas(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|part| (*part).to_owned()).collect()
    }

    /// The whole path the frontend payload travels: prompt construction, the
    /// loopback policy, request framing, SSE parsing and delta assembly.
    #[tokio::test]
    async fn streams_a_translation_and_sends_the_selected_tone() {
        let server = MockProvider::start(
            deltas(&["[[LANGUAGE:", "English]]\n", "Bonjour", " le monde"]),
            Duration::from_millis(5),
        );
        let profile = profile(server.base_url.clone());
        let client = reqwest::Client::new();

        // Exactly what a user-defined tone produces on the frontend: the tone's
        // name as the style, its requirements as the free text.
        let prompt = build_user_prompt(
            "Auto Detect",
            "French",
            "Academic",
            "Cite terminology precisely.",
            "Hello world",
        );

        let mut received = String::new();
        stream_translation(
            &client,
            &profile,
            "sk-test-key-not-real",
            &[],
            &prompt,
            Arc::new(AtomicBool::new(false)),
            |delta| received.push_str(&delta),
        )
        .await
        .expect("streaming should succeed against the mock endpoint");

        assert_eq!(received, "[[LANGUAGE:English]]\nBonjour le monde");

        let request = server.captured_request();
        assert!(
            request.contains("mock-model"),
            "model must reach the provider"
        );
        // Asserted as one contiguous phrase, not as separate `contains` calls:
        // loose checks still pass when the prompt arguments are transposed.
        assert!(
            request
                .contains("Style: Academic. Additional requirements: Cite terminology precisely."),
            "the tone name and its requirements must arrive in the right fields, got {request}"
        );
        assert!(
            request.contains("Translate from Auto Detect to French."),
            "languages must arrive in the right order, got {request}"
        );
        assert!(
            request.contains("Hello world"),
            "source text must reach the provider"
        );
    }

    /// Stop must actually end the stream rather than merely hiding the output.
    #[tokio::test]
    async fn cancellation_stops_consuming_the_stream() {
        let server = MockProvider::start(
            deltas(&[
                "[[LANGUAGE:English]]\n",
                "one ",
                "two ",
                "three ",
                "four ",
                "five ",
            ]),
            Duration::from_millis(60),
        );
        let profile = profile(server.base_url.clone());
        let client = reqwest::Client::new();
        let cancel = Arc::new(AtomicBool::new(false));

        let flag = cancel.clone();
        let mut chunks = 0usize;
        let mut received = String::new();
        stream_translation(
            &client,
            &profile,
            "sk-test-key-not-real",
            &[],
            &build_user_prompt("Auto Detect", "French", "natural", "", "count"),
            cancel.clone(),
            |delta| {
                chunks += 1;
                received.push_str(&delta);
                if chunks == 2 {
                    flag.store(true, Ordering::SeqCst);
                }
            },
        )
        .await
        .expect("a cancelled stream ends cleanly rather than erroring");

        assert!(
            !received.contains("five"),
            "cancellation should stop well before the end, got {received:?}"
        );
    }

    /// A builtin tone sends its key and no requirements; the prompt says so
    /// explicitly rather than leaving the model to guess.
    #[test]
    fn builtin_tone_reports_no_extra_requirements() {
        let prompt = build_user_prompt("English", "German", "business", "", "Hello");
        assert!(prompt.contains("Style: business"));
        assert!(prompt.contains("Additional requirements: none"));
    }

    #[test]
    fn local_prompt_returns_plain_text_without_the_language_marker_protocol() {
        let prompt = build_local_prompt(
            "Auto Detect",
            "Chinese (Simplified)",
            "natural",
            "",
            "Hello",
        );
        assert!(prompt.contains("Return only the translation"));
        assert!(prompt.contains("Chinese (Simplified)"));
        assert!(!prompt.contains("[[LANGUAGE:"));
        assert!(!prompt.contains("Auto Detect"));
    }

    #[test]
    fn translategemma_uses_its_single_message_format() {
        let prompt = build_translategemma_prompt(
            "Chinese (Simplified)",
            "English",
            "natural",
            "Keep names",
            "你好",
        );
        assert!(
            prompt.contains("You are a professional Chinese (Simplified) to English translator.")
        );
        assert!(prompt.ends_with("\n\n你好"));
        assert!(prompt.contains("Keep names"));
        assert!(!prompt.contains("[[LANGUAGE:"));
    }
}
