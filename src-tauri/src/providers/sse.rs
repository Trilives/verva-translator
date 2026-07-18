use futures_util::StreamExt;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

pub async fn consume<F, P>(
    response: reqwest::Response,
    cancel: Arc<AtomicBool>,
    mut parse: P,
    mut on_delta: F,
) -> Result<(), String>
where
    F: FnMut(String) + Send,
    P: FnMut(&str) -> Option<String>,
{
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Provider returned {status}: {}", redact(&body)));
    }
    let mut stream = response.bytes_stream();
    let mut pending = String::new();
    while let Some(chunk) = stream.next().await {
        if cancel.load(Ordering::Relaxed) {
            return Ok(());
        }
        pending.push_str(&String::from_utf8_lossy(&chunk.map_err(|e| e.to_string())?));
        while let Some(index) = pending.find('\n') {
            let line = pending[..index].trim_end_matches('\r').to_owned();
            pending.drain(..=index);
            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    return Ok(());
                }
                if let Some(delta) = parse(data) {
                    on_delta(delta);
                }
            }
        }
    }
    Ok(())
}

fn redact(body: &str) -> String {
    let compact = body.replace(['\r', '\n'], " ");
    compact.chars().take(400).collect()
}
