mod claude;
mod openai;
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
}
