use crate::{models::ProviderProfile, providers, state::AppState};
use tauri::State;
use zeroize::Zeroizing;

#[tauri::command]
pub fn save_api_key(
    state: State<'_, AppState>,
    profile_id: String,
    api_key: String,
) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("The API key cannot be empty".into());
    }
    state
        .secrets
        .set(&secret_key(&profile_id), api_key.into_bytes())
}

#[tauri::command]
pub fn has_api_key(state: State<'_, AppState>, profile_id: String) -> Result<bool, String> {
    Ok(state.secrets.get(&secret_key(&profile_id))?.is_some())
}

#[tauri::command]
pub fn delete_api_key(state: State<'_, AppState>, profile_id: String) -> Result<(), String> {
    state.secrets.remove(&secret_key(&profile_id))
}

pub(super) fn secret_key(profile_id: &str) -> String {
    format!("provider-key:{profile_id}")
}

pub(super) fn load_provider_key(
    state: &AppState,
    profile: &ProviderProfile,
) -> Result<Zeroizing<String>, String> {
    match state.secrets.get(&secret_key(&profile.id))? {
        Some(bytes) => Ok(Zeroizing::new(
            String::from_utf8(bytes).map_err(|_| "The stored API key is invalid")?,
        )),
        None if providers::is_lan_endpoint(&profile.base_url) => Ok(Zeroizing::new(String::new())),
        None => Err("No API key is stored for this configuration".into()),
    }
}
