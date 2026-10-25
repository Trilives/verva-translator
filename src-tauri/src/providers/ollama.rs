use super::StreamRequest;
use crate::models::ProviderProfile;
use futures_util::StreamExt;
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

const BASE: &str = "http://127.0.0.1:11434";

pub async fn stream<F>(
    request: StreamRequest<'_>,
    cancel: Arc<AtomicBool>,
    mut on_delta: F,
) -> Result<(), String>
where
    F: FnMut(String) + Send,
{
    if request.profile.model.trim().is_empty() {
        return Err("Choose an installed Ollama model".into());
    }
    let mut messages = Vec::new();
    for turn in request.history {
        messages.push(json!({"role":"user", "content":turn.user}));
        messages.push(json!({"role":"assistant", "content":turn.assistant}));
    }
    messages.push(json!({"role":"user", "content":request.prompt}));
    let response = request
        .client
        .post(format!("{BASE}/api/chat"))
        .json(
            &json!({"model":request.profile.model,"messages":messages,"stream":true,
            "think":false,"options":{"temperature":0.1,"num_ctx":4096}}),
        )
        .send()
        .await
        .map_err(|_| "Ollama is not running".to_owned())?;
    if !response.status().is_success() {
        return Err(format!("Ollama returned {}", response.status()));
    }
    let mut bytes = response.bytes_stream();
    let mut pending = Vec::new();
    let mut output_bytes = 0usize;
    loop {
        let next = tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(100)) => {
                if cancel.load(Ordering::Relaxed) { return Ok(()); }
                continue;
            },
            next = bytes.next() => next,
        };
        if cancel.load(Ordering::Relaxed) {
            return Ok(());
        }
        let Some(next) = next else { break };
        pending.extend_from_slice(&next.map_err(|e| e.to_string())?);
        if pending.len() > 1024 * 1024 {
            return Err("Ollama response is too large".into());
        }
        while let Some(index) = pending.iter().position(|byte| *byte == b'\n') {
            let line = pending.drain(..=index).collect::<Vec<_>>();
            let value: Value = serde_json::from_slice(&line).map_err(|e| e.to_string())?;
            if let Some(error) = value.get("error").and_then(Value::as_str) {
                return Err(error.chars().take(400).collect());
            }
            if let Some(content) = value.pointer("/message/content").and_then(Value::as_str) {
                if !content.is_empty() {
                    output_bytes += content.len();
                    on_delta(content.to_owned());
                }
            }
            if value.get("done").and_then(Value::as_bool) == Some(true) {
                return if output_bytes > 0 {
                    Ok(())
                } else {
                    Err("Ollama returned no translation text".into())
                };
            }
        }
    }
    Err("Ollama translation stream ended before completion".into())
}

pub async fn list(client: &reqwest::Client) -> Result<Vec<String>, String> {
    let value: Value = client
        .get(format!("{BASE}/api/tags"))
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .map_err(|_| "Ollama is not running".to_owned())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    Ok(value
        .get("models")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|model| model.get("name").and_then(Value::as_str).map(str::to_owned))
        .collect())
}

pub async fn probe(client: &reqwest::Client, profile: &ProviderProfile) -> Result<(), String> {
    if profile.model.trim().is_empty() {
        return Err("Choose an installed Ollama model".into());
    }
    let models = list(client).await?;
    if models.iter().any(|name| name == &profile.model) {
        Ok(())
    } else {
        Err("The selected Ollama model is not installed".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProviderKind, ThinkingLevel};

    #[tokio::test]
    #[ignore = "requires a running Ollama with gemma3:1b-it-q4_K_M installed"]
    async fn streams_a_plain_translation_from_the_installed_local_model() {
        let client = reqwest::Client::builder().no_proxy().build().unwrap();
        let profile = ProviderProfile {
            id: "ollama-local".into(),
            kind: ProviderKind::Ollama,
            base_url: BASE.into(),
            model: "gemma3:1b-it-q4_K_M".into(),
            thinking: ThinkingLevel::Off,
            long_conversation: false,
            context_limit: 4096,
        };
        let prompt = super::super::build_local_prompt(
            "Auto Detect",
            "Chinese (Simplified)",
            "natural",
            "",
            "The device is ready. Please restart the app before continuing.",
        );
        let mut output = String::new();
        stream(
            StreamRequest {
                client: &client,
                profile: &profile,
                key: "",
                system: "",
                history: &[],
                prompt: &prompt,
            },
            Arc::new(AtomicBool::new(false)),
            |delta| output.push_str(&delta),
        )
        .await
        .unwrap();
        assert!(!output.trim().is_empty());
        assert!(!output.contains("[[LANGUAGE:"));
        assert!(!output.contains("<think>"));
    }
}
