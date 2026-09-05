use super::StreamRequest;
use serde_json::{json, Value};
use std::sync::{atomic::AtomicBool, Arc};

pub async fn stream<F>(
    request: StreamRequest<'_>,
    cancel: Arc<AtomicBool>,
    mut on_delta: F,
) -> Result<(), String>
where
    F: FnMut(String) + Send,
{
    let StreamRequest {
        client,
        profile,
        key,
        system,
        history,
        prompt,
    } = request;
    let endpoint = endpoint(&profile.base_url);
    let mut messages = vec![json!({"role":"system","content":system})];
    for turn in history {
        messages.push(json!({"role":"user","content":turn.user}));
        messages.push(json!({"role":"assistant","content":turn.assistant}));
    }
    messages.push(json!({"role":"user","content":prompt}));
    let mut body = json!({"model":profile.model,"messages":messages,"stream":true});
    if let Some(effort) = profile.thinking.openai_effort() {
        body["reasoning_effort"] = json!(effort);
    }
    let mut request = client.post(endpoint).json(&body);
    if !key.is_empty() {
        request = request.bearer_auth(key);
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
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
        if let Some(text) = value
            .pointer("/choices/0/message/content")
            .and_then(Value::as_str)
        {
            on_delta(text.to_owned());
            return Ok(());
        }
        return Err("The OpenAI-compatible response did not contain translation text".into());
    }
    super::sse::consume(
        response,
        cancel,
        |data| {
            let value: Value = serde_json::from_str(data).ok()?;
            value
                .pointer("/choices/0/delta/content")
                .and_then(Value::as_str)
                .map(str::to_owned)
        },
        on_delta,
    )
    .await
}

pub async fn probe(
    client: &reqwest::Client,
    profile: &crate::models::ProviderProfile,
    key: &str,
) -> Result<(), String> {
    let mut request = client.post(endpoint(&profile.base_url)).json(&json!({
        "model": profile.model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1,
        "stream": false
    }));
    if !key.is_empty() {
        request = request.bearer_auth(key);
    }
    let response = request
        .timeout(std::time::Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    super::probe::check_response(response.status(), response.text().await.ok()).await
}

fn endpoint(base: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with("/chat/completions") {
        base.into()
    } else {
        format!("{base}/chat/completions")
    }
}
