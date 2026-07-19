use super::secrets::secret_key;
use crate::{models::ProviderProfile, providers, state::AppState};
use serde::Serialize;
use tauri::State;
use zeroize::Zeroizing;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionReport {
    pub ok: bool,
    /// Round trip in milliseconds; only meaningful when `ok`.
    pub latency_ms: Option<u64>,
    /// Already redacted; safe to show in the UI.
    pub message: Option<String>,
}

/// Sends the smallest possible completion to the configured endpoint so the
/// user can confirm the base URL, model and key before translating.
#[tauri::command]
pub async fn test_profile(
    state: State<'_, AppState>,
    profile: ProviderProfile,
) -> Result<ConnectionReport, String> {
    let key_bytes = match state.secrets.get(&secret_key(&profile.id))? {
        Some(bytes) => bytes,
        None => {
            return Ok(ConnectionReport {
                ok: false,
                latency_ms: None,
                message: Some("No API key is stored for this configuration".into()),
            })
        }
    };
    let api_key =
        Zeroizing::new(String::from_utf8(key_bytes).map_err(|_| "The stored API key is invalid")?);

    let started = std::time::Instant::now();
    let outcome = providers::probe(&state.client, &profile, &api_key).await;
    let latency = started.elapsed().as_millis() as u64;

    Ok(match outcome {
        Ok(()) => ConnectionReport {
            ok: true,
            latency_ms: Some(latency),
            message: None,
        },
        Err(error) => ConnectionReport {
            ok: false,
            latency_ms: None,
            message: Some(providers::redact(&error, &api_key)),
        },
    })
}
