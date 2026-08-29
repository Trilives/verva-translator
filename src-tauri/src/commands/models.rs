use super::secrets::load_provider_key;
use crate::{models::ProviderProfile, providers, state::AppState};
use tauri::State;

#[tauri::command]
pub async fn list_models(
    state: State<'_, AppState>,
    profile: ProviderProfile,
) -> Result<Vec<String>, String> {
    let api_key = load_provider_key(&state, &profile)?;
    providers::list_models(&state.client, &profile, &api_key)
        .await
        .map_err(|error| providers::redact(&error, &api_key))
}
