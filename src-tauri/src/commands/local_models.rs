//! Local Ollama lifecycle and image transcription. All traffic stays on loopback.
use crate::state::AppState;
use dashmap::mapref::entry::Entry;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::watch;

const OLLAMA: &str = "http://127.0.0.1:11434";
const PULL_CANCELLED: &str = "LOCAL_PULL_CANCELLED";
const PULL_FAKE_IP: &str = "OLLAMA_REDIRECT_FAKE_IP";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModel {
    name: String,
    size: u64,
    running: bool,
    quantization: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStatus {
    available: bool,
    models: Vec<LocalModel>,
    active_pulls: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PullProgress<'a> {
    model: &'a str,
    status: String,
    completed: u64,
    total: u64,
    done: bool,
}

#[derive(Deserialize)]
struct OllamaModels {
    models: Vec<OllamaModel>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: String,
    #[serde(default)]
    size: u64,
    details: Option<OllamaModelDetails>,
}

#[derive(Deserialize)]
struct OllamaModelDetails {
    quantization_level: Option<String>,
}

fn validate_model(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.len() > 120
        || !name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:/-".contains(&b))
    {
        return Err("Invalid local model name".into());
    }
    Ok(())
}

async fn models(client: &reqwest::Client, path: &str) -> Result<OllamaModels, String> {
    client
        .get(format!("{OLLAMA}{path}"))
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .map_err(|_| "Ollama is not running on this computer".to_owned())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn local_model_status(state: State<'_, AppState>) -> Result<LocalStatus, String> {
    let active_pulls = state
        .pull_cancellations
        .iter()
        .map(|entry| entry.key().clone())
        .collect();
    let installed = match models(&state.client, "/api/tags").await {
        Ok(value) => value.models,
        Err(_) => {
            return Ok(LocalStatus {
                available: false,
                models: vec![],
                active_pulls,
            })
        }
    };
    let running = models(&state.client, "/api/ps")
        .await
        .map(|value| value.models.into_iter().map(|m| m.name).collect::<Vec<_>>())
        .unwrap_or_default();
    Ok(LocalStatus {
        available: true,
        active_pulls,
        models: installed
            .into_iter()
            .map(|m| LocalModel {
                running: running.contains(&m.name),
                name: m.name,
                size: m.size,
                quantization: m.details.and_then(|details| details.quantization_level),
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn pull_local_model(
    app: AppHandle,
    state: State<'_, AppState>,
    model: String,
) -> Result<(), String> {
    validate_model(&model)?;
    let (cancel_tx, mut cancel_rx) = watch::channel(false);
    match state.pull_cancellations.entry(model.clone()) {
        Entry::Occupied(_) => return Err("This model is already downloading".into()),
        Entry::Vacant(entry) => {
            entry.insert(cancel_tx);
        }
    }
    let result = pull_model_stream(&app, &state.client, &model, &mut cancel_rx).await;
    state.pull_cancellations.remove(&model);
    result
}

#[tauri::command]
pub fn cancel_local_model_pull(state: State<'_, AppState>, model: String) -> Result<(), String> {
    validate_model(&model)?;
    if let Some(sender) = state.pull_cancellations.get(&model) {
        let _ = sender.send(true);
    }
    Ok(())
}

fn pull_error(message: &str) -> String {
    if message.contains("redirect target not allowed")
        && (message.contains("198.18.") || message.contains("198.19."))
    {
        return PULL_FAKE_IP.into();
    }
    // Ollama errors can contain a full signed download URL. Never show its query string.
    if message.contains("http://") || message.contains("https://") {
        return "Ollama could not download the model. Check its network connection and retry."
            .into();
    }
    message.chars().take(300).collect()
}

async fn pull_model_stream(
    app: &AppHandle,
    client: &reqwest::Client,
    model: &str,
    cancel_rx: &mut watch::Receiver<bool>,
) -> Result<(), String> {
    let request = client
        .post(format!("{OLLAMA}/api/pull"))
        .json(&json!({ "model": model, "stream": true }))
        .timeout(Duration::from_secs(60 * 60))
        .send();
    let response = tokio::select! {
        biased;
        _ = cancel_rx.changed() => return Err(PULL_CANCELLED.into()),
        response = request => response.map_err(|e| {
            if e.is_connect() { "Ollama is not running on this computer".into() }
            else { pull_error(&e.to_string()) }
        })?,
    };
    if !response.status().is_success() {
        return Err(format!("Ollama returned {}", response.status()));
    }
    let mut bytes = response.bytes_stream();
    let mut pending = Vec::new();
    let mut succeeded = false;
    loop {
        let part = tokio::select! {
            biased;
            _ = cancel_rx.changed() => return Err(PULL_CANCELLED.into()),
            part = bytes.next() => part,
        };
        let Some(part) = part else { break };
        pending.extend_from_slice(&part.map_err(|e| pull_error(&e.to_string()))?);
        if pending.len() > 128 * 1024 {
            return Err("Ollama sent an oversized progress update".into());
        }
        while let Some(pos) = pending.iter().position(|&b| b == b'\n') {
            let line = pending.drain(..=pos).collect::<Vec<_>>();
            let value: Value = serde_json::from_slice(&line).map_err(|e| e.to_string())?;
            if let Some(error) = value.get("error").and_then(Value::as_str) {
                return Err(pull_error(error));
            }
            let status = value
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_owned();
            let done = status == "success";
            succeeded |= done;
            let _ = app.emit(
                "local-model-pull",
                PullProgress {
                    model: &model,
                    status,
                    done,
                    completed: value.get("completed").and_then(Value::as_u64).unwrap_or(0),
                    total: value.get("total").and_then(Value::as_u64).unwrap_or(0),
                },
            );
        }
    }
    if succeeded {
        Ok(())
    } else {
        Err("The model download ended before completion".into())
    }
}

async fn set_loaded(client: &reqwest::Client, model: &str, keep_alive: &str) -> Result<(), String> {
    validate_model(model)?;
    let response = client
        .post(format!("{OLLAMA}/api/generate"))
        .json(&json!({ "model": model, "stream": false, "keep_alive": keep_alive }))
        .timeout(Duration::from_secs(180))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Ollama returned {}", response.status()))
    }
}

#[tauri::command]
pub async fn load_local_model(state: State<'_, AppState>, model: String) -> Result<(), String> {
    set_loaded(&state.client, &model, "30m").await
}

#[tauri::command]
pub async fn unload_local_model(state: State<'_, AppState>, model: String) -> Result<(), String> {
    set_loaded(&state.client, &model, "0").await
}

#[cfg(test)]
mod tests {
    use super::{pull_error, validate_model, PULL_FAKE_IP};
    #[test]
    fn rejects_names_that_could_escape_the_model_catalog() {
        assert!(validate_model("qwen3.5:4b").is_ok());
        assert!(validate_model("translategemma:4b").is_ok());
        assert!(validate_model("../model?x=1").is_err());
        assert!(validate_model("model\nother").is_err());
    }

    #[test]
    fn pull_errors_hide_signed_urls_and_identify_fake_ip_dns() {
        let signed = "max retries exceeded: Get \"https://example.r2.cloudflarestorage.com/data?X-Amz-Signature=secret\": redirect target not allowed: example.r2.cloudflarestorage.com resolves to non-public 198.18.0.18";
        assert_eq!(pull_error(signed), PULL_FAKE_IP);
        let other = pull_error("download failed: https://example.com/data?X-Amz-Signature=secret");
        assert!(!other.contains("secret"));
        assert!(!other.contains("https://"));
    }
}
