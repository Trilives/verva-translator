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
