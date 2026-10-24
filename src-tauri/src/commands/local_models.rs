//! Local Ollama lifecycle and image transcription. All traffic stays on loopback.
use crate::state::AppState;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const OLLAMA: &str = "http://127.0.0.1:11434";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModel {
    name: String,
    size: u64,
    running: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStatus {
    available: bool,
    models: Vec<LocalModel>,
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
    let installed = match models(&state.client, "/api/tags").await {
        Ok(value) => value.models,
        Err(_) => {
            return Ok(LocalStatus {
                available: false,
                models: vec![],
            })
        }
    };
    let running = models(&state.client, "/api/ps")
        .await
        .map(|value| value.models.into_iter().map(|m| m.name).collect::<Vec<_>>())
        .unwrap_or_default();
    Ok(LocalStatus {
        available: true,
        models: installed
            .into_iter()
            .map(|m| LocalModel {
                running: running.contains(&m.name),
                name: m.name,
                size: m.size,
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
    let response = state
        .client
        .post(format!("{OLLAMA}/api/pull"))
        .json(&json!({ "model": model, "stream": true }))
        .timeout(Duration::from_secs(60 * 60))
        .send()
        .await
        .map_err(|_| "Ollama is not running on this computer".to_owned())?;
    if !response.status().is_success() {
        return Err(format!("Ollama returned {}", response.status()));
    }
    let mut bytes = response.bytes_stream();
    let mut pending = Vec::new();
    let mut succeeded = false;
    while let Some(part) = bytes.next().await {
        pending.extend_from_slice(&part.map_err(|e| e.to_string())?);
        if pending.len() > 128 * 1024 {
            return Err("Ollama sent an oversized progress update".into());
        }
        while let Some(pos) = pending.iter().position(|&b| b == b'\n') {
            let line = pending.drain(..=pos).collect::<Vec<_>>();
            let value: Value = serde_json::from_slice(&line).map_err(|e| e.to_string())?;
            if let Some(error) = value.get("error").and_then(Value::as_str) {
                return Err(error.into());
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
    use super::validate_model;
    #[test]
    fn rejects_names_that_could_escape_the_model_catalog() {
        assert!(validate_model("qwen3.5:4b").is_ok());
        assert!(validate_model("translategemma:4b").is_ok());
        assert!(validate_model("../model?x=1").is_err());
        assert!(validate_model("model\nother").is_err());
    }
}
