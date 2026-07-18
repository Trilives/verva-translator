use crate::models::{ConversationTurn, ProviderProfile};
use serde_json::{json, Value};
use std::sync::{atomic::AtomicBool, Arc};

pub async fn stream<F>(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    key: &str,
    system: &str,
    history: &[ConversationTurn],
    prompt: &str,
    cancel: Arc<AtomicBool>,
    mut on_delta: F,
) -> Result<(), String>
where
    F: FnMut(String) + Send,
{
    let mut messages = Vec::new();
    for turn in history {
        messages.push(json!({"role":"user","content":turn.user}));
        messages.push(json!({"role":"assistant","content":turn.assistant}));
    }
    messages.push(json!({"role":"user","content":prompt}));
    let mut body = json!({"model":profile.model,"system":system,"messages":messages,"max_tokens":4096,"stream":true});
    if profile.thinking {
        body["thinking"] = json!({"type":"enabled","budget_tokens":2048});
        body["max_tokens"] = json!(6144);
    }
    let response = client
        .post(endpoint(&profile.base_url))
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .contains("text/event-stream")
    {
        let status = response.status();
        let value: Value = response.json().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!("Provider returned {status}"));
        }
        if let Some(text) = value.pointer("/content/0/text").and_then(Value::as_str) {
            on_delta(text.to_owned());
            return Ok(());
        }
        return Err("The Claude-compatible response did not contain translation text".into());
    }
    super::sse::consume(
        response,
        cancel,
        |data| {
            let value: Value = serde_json::from_str(data).ok()?;
            (value.get("type")?.as_str()? == "content_block_delta")
                .then(|| value.pointer("/delta/text")?.as_str().map(str::to_owned))
                .flatten()
        },
        on_delta,
    )
    .await
}

fn endpoint(base: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with("/v1/messages") {
        base.into()
    } else if base.ends_with("/v1") {
        format!("{base}/messages")
    } else {
        format!("{base}/v1/messages")
    }
}
