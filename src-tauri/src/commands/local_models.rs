//! Local Ollama lifecycle and image transcription. All traffic stays on loopback.
use crate::state::AppState;
use dashmap::mapref::entry::Entry;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    net::TcpListener,
    process::{Child, Command, Stdio},
    time::Duration,
};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::watch;

const OLLAMA: &str = "http://127.0.0.1:11434";
const PULL_CANCELLED: &str = "LOCAL_PULL_CANCELLED";
const PULL_FAKE_IP: &str = "OLLAMA_REDIRECT_FAKE_IP";

struct ProxyOllama {
    child: Child,
    base_url: String,
}

impl Drop for ProxyOllama {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn proxy_url(input: Option<&str>) -> Result<Option<String>, String> {
    let value = input.unwrap_or("").trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.len() > 512 {
        return Err("Invalid Ollama proxy address".into());
    }
    let value = if value.contains("://") {
        value.to_owned()
    } else {
        format!("http://{value}")
    };
    let parsed = reqwest::Url::parse(&value).map_err(|_| "Invalid Ollama proxy address")?;
    if !matches!(parsed.scheme(), "http" | "https")
        || parsed.host_str().is_none()
        || parsed.username() != ""
        || parsed.password().is_some()
        || parsed.path() != "/"
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err("Invalid Ollama proxy address".into());
    }
    Ok(Some(value))
}

fn ollama_executable() -> Option<std::path::PathBuf> {
    let name = if cfg!(windows) {
        "ollama.exe"
    } else {
        "ollama"
    };
    let mut candidates = Vec::new();
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        candidates.push(
            std::path::PathBuf::from(local)
                .join("Programs/Ollama")
                .join(name),
        );
    }
    if let Some(programs) = std::env::var_os("ProgramFiles") {
        candidates.push(std::path::PathBuf::from(programs).join("Ollama").join(name));
    }
    if let Some(path) = std::env::var_os("PATH") {
        candidates.extend(std::env::split_paths(&path).map(|dir| dir.join(name)));
    }
    candidates.into_iter().find(|path| path.is_file())
}

impl ProxyOllama {
    async fn start(client: &reqwest::Client, proxy: &str) -> Result<Self, String> {
        let executable = ollama_executable().ok_or("OLLAMA_EXECUTABLE_MISSING")?;
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        drop(listener);
        let base_url = format!("http://127.0.0.1:{port}");
        let mut command = Command::new(executable);
        command
            .arg("serve")
            .env("OLLAMA_HOST", format!("127.0.0.1:{port}"))
            .env("HTTPS_PROXY", proxy)
            .env_remove("HTTP_PROXY")
            .env("NO_PROXY", "127.0.0.1,localhost")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        #[cfg(windows)]
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        let child = command.spawn().map_err(|e| e.to_string())?;
        let mut server = Self { child, base_url };
        for _ in 0..100 {
            if server
                .child
                .try_wait()
                .map_err(|e| e.to_string())?
                .is_some()
            {
                return Err("Ollama proxy download service exited during startup".into());
            }
            if client
                .get(format!("{}/api/version", server.base_url))
                .timeout(Duration::from_millis(500))
                .send()
                .await
                .is_ok_and(|response| response.status().is_success())
            {
                return Ok(server);
            }
            tokio::time::sleep(Duration::from_millis(150)).await;
        }
        Err("Ollama proxy download service did not start".into())
    }
}

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
    ollama_installed: bool,
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
    let ollama_installed = ollama_executable().is_some();
    let active_pulls = state
        .pull_cancellations
        .iter()
        .map(|entry| entry.key().clone())
        .collect();
    let installed = match models(&state.local_client, "/api/tags").await {
        Ok(value) => value.models,
        Err(_) => {
            return Ok(LocalStatus {
                available: false,
                ollama_installed,
                models: vec![],
                active_pulls,
            })
        }
    };
    let running = models(&state.local_client, "/api/ps")
        .await
        .map(|value| value.models.into_iter().map(|m| m.name).collect::<Vec<_>>())
        .unwrap_or_default();
    Ok(LocalStatus {
        available: true,
        ollama_installed,
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
    proxy: Option<String>,
) -> Result<(), String> {
    validate_model(&model)?;
    let proxy = proxy_url(proxy.as_deref())?;
    let (cancel_tx, mut cancel_rx) = watch::channel(false);
    match state.pull_cancellations.entry(model.clone()) {
        Entry::Occupied(_) => return Err("This model is already downloading".into()),
        Entry::Vacant(entry) => {
            entry.insert(cancel_tx);
        }
    }
    let result = pull_with_proxy(
        &app,
        &state.local_client,
        &model,
        proxy.as_deref(),
        &mut cancel_rx,
    )
    .await;
    state.pull_cancellations.remove(&model);
    result
}

async fn pull_with_proxy(
    app: &AppHandle,
    client: &reqwest::Client,
    model: &str,
    proxy: Option<&str>,
    cancel_rx: &mut watch::Receiver<bool>,
) -> Result<(), String> {
    let server = if let Some(proxy) = proxy {
        Some(tokio::select! {
            biased;
            _ = cancel_rx.changed() => return Err(PULL_CANCELLED.into()),
            server = ProxyOllama::start(client, proxy) => server?,
        })
    } else {
        None
    };
    let base_url = server
        .as_ref()
        .map_or(OLLAMA, |server| server.base_url.as_str());
    pull_model_stream(app, client, base_url, model, cancel_rx).await
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

fn pull_http_error(status: reqwest::StatusCode, body: &str) -> String {
    if let Ok(value) = serde_json::from_str::<Value>(body) {
        if let Some(message) = value.get("error").and_then(Value::as_str) {
            return pull_error(message);
        }
    }
    format!("Ollama returned {status}")
}

async fn pull_model_stream(
    app: &AppHandle,
    client: &reqwest::Client,
    base_url: &str,
    model: &str,
    cancel_rx: &mut watch::Receiver<bool>,
) -> Result<(), String> {
    let request = client
        .post(format!("{base_url}/api/pull"))
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
        let status = response.status();
        let body = tokio::select! {
            biased;
            _ = cancel_rx.changed() => return Err(PULL_CANCELLED.into()),
            body = response.text() => body.unwrap_or_default(),
        };
        return Err(pull_http_error(status, &body));
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
    set_loaded(&state.local_client, &model, "30m").await
}

#[tauri::command]
pub async fn unload_local_model(state: State<'_, AppState>, model: String) -> Result<(), String> {
    set_loaded(&state.local_client, &model, "0").await
}

#[cfg(test)]
mod tests {
    use super::{
        proxy_url, pull_error, pull_http_error, validate_model, ProxyOllama, PULL_FAKE_IP,
    };
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
        assert_eq!(
            pull_http_error(
                reqwest::StatusCode::INTERNAL_SERVER_ERROR,
                &serde_json::json!({ "error": signed }).to_string()
            ),
            PULL_FAKE_IP
        );
        let other = pull_error("download failed: https://example.com/data?X-Amz-Signature=secret");
        assert!(!other.contains("secret"));
        assert!(!other.contains("https://"));
    }

    #[test]
    fn accepts_an_optional_http_proxy_but_rejects_credentials_and_paths() {
        assert_eq!(proxy_url(Some(" ")).unwrap(), None);
        assert_eq!(
            proxy_url(Some("127.0.0.1:7897")).unwrap().as_deref(),
            Some("http://127.0.0.1:7897")
        );
        assert_eq!(
            proxy_url(Some("https://proxy.example:8443"))
                .unwrap()
                .as_deref(),
            Some("https://proxy.example:8443")
        );
        assert!(proxy_url(Some("socks5://127.0.0.1:7897")).is_err());
        assert!(proxy_url(Some("http://user:secret@localhost:7897")).is_err());
        assert!(proxy_url(Some("http://localhost:7897/path")).is_err());
    }

    #[tokio::test]
    #[ignore = "requires a local Ollama installation and VERVA_TEST_PROXY"]
    async fn temporary_proxy_worker_starts_on_a_separate_port() {
        let proxy = std::env::var("VERVA_TEST_PROXY").expect("set VERVA_TEST_PROXY");
        let client = reqwest::Client::builder().no_proxy().build().unwrap();
        let server = ProxyOllama::start(&client, &proxy).await.unwrap();
        assert_ne!(server.base_url, super::OLLAMA);
        let response = client
            .get(format!("{}/api/version", server.base_url))
            .send()
            .await
            .unwrap();
        assert!(response.status().is_success());
        let url = server.base_url.clone();
        drop(server);
        assert!(client
            .get(format!("{url}/api/version"))
            .timeout(std::time::Duration::from_secs(1))
            .send()
            .await
            .is_err());
    }
}
