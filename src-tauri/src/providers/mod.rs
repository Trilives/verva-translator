mod claude;
mod openai;
mod prompt;
mod sse;

use crate::models::{ConversationTurn, ProviderKind, ProviderProfile};
use serde_json::Value;
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
    validate_endpoint(&profile.base_url)?;
    let request = StreamRequest {
        client,
        profile,
        key: api_key,
        system: prompt::system_prompt(),
        history,
        prompt: user_prompt,
    };
    match profile.kind {
        ProviderKind::Openai => openai::stream(request, cancel, on_delta).await,
        ProviderKind::Claude => claude::stream(request, cancel, on_delta).await,
    }
}

/// One minimal non-streaming request, used by the Settings connectivity check.
/// Any token the endpoint returns is discarded; only reachability matters.
pub async fn probe(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    api_key: &str,
) -> Result<(), String> {
    validate_endpoint(&profile.base_url)?;
    match profile.kind {
        ProviderKind::Openai => openai::probe(client, profile, api_key).await,
        ProviderKind::Claude => claude::probe(client, profile, api_key).await,
    }
}

/// Shared verdict for both adapters' probes. A model that refuses the one-token
/// budget still proves the endpoint, model name and credential are usable.
async fn check_probe_response(
    status: reqwest::StatusCode,
    body: Option<String>,
) -> Result<(), String> {
    if status.is_success() {
        return Ok(());
    }
    let detail = body
        .as_deref()
        .and_then(|text| serde_json::from_str::<Value>(text).ok())
        .and_then(|value| {
            value
                .pointer("/error/message")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .or(body)
        .unwrap_or_default();
    Err(if detail.is_empty() {
        format!("Provider returned {status}")
    } else {
        format!("Provider returned {status}: {detail}")
    })
}

/// Removes the active key from a message before it can reach the UI or a log.
pub fn redact(message: &str, api_key: &str) -> String {
    let trimmed = api_key.trim();
    let cleaned = if trimmed.len() >= 8 {
        message.replace(trimmed, "***")
    } else {
        message.to_owned()
    };
    // Provider errors can echo a whole request body; keep them short.
    if cleaned.chars().count() > 400 {
        cleaned.chars().take(400).collect::<String>() + "…"
    } else {
        cleaned
    }
}

fn validate_endpoint(value: &str) -> Result<(), String> {
    let url = reqwest::Url::parse(value).map_err(|_| "The provider Base URL is invalid")?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"));
    if url.scheme() != "https" && !(url.scheme() == "http" && local) {
        return Err("Remote provider endpoints must use HTTPS".into());
    }
    Ok(())
}

pub fn build_user_prompt(
    source: &str,
    target: &str,
    style: &str,
    custom: &str,
    text: &str,
) -> String {
    format!("Translate from {source} to {target}. Style: {style}. Additional requirements: {}. Detect the actual source language. First output exactly [[LANGUAGE:language name]] on its own line, then only the translation. Text:\n{text}", if custom.trim().is_empty() { "none" } else { custom })
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
            thinking: false,
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
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn endpoint_policy() {
        assert!(validate_endpoint("https://api.example.com/v1").is_ok());
        assert!(validate_endpoint("http://localhost:11434/v1").is_ok());
        assert!(validate_endpoint("http://example.com/v1").is_err());
    }

    #[test]
    fn redaction_removes_the_key_and_bounds_length() {
        let key = "sk-secret-value-1234";
        let message = format!("401 from provider using {key}");
        let cleaned = redact(&message, key);
        assert!(!cleaned.contains(key));
        assert!(cleaned.contains("***"));

        let long = "x".repeat(900);
        assert!(redact(&long, key).chars().count() <= 401);
    }

    #[test]
    fn redaction_ignores_implausibly_short_keys() {
        // A 3-character "key" would otherwise blank out ordinary words.
        assert_eq!(redact("the model is gpt", "the"), "the model is gpt");
    }
}
