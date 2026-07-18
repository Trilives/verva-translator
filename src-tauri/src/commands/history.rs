use crate::{history, models::HistoryEntry, state::AppState};
use tauri::State;

#[tauri::command]
pub fn list_history(state: State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    history::list(&state.secrets)
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    history::clear(&state.secrets)
}
