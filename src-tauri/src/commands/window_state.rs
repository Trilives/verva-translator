use tauri::{AppHandle, Manager};

/// Hides the main window to the tray. Used by the close prompt and by the
/// "minimize to tray" close behaviour.
#[tauri::command]
pub fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("The main window is unavailable")?;
    window.hide().map_err(|error| error.to_string())
}

/// Quits for real, bypassing the close-behaviour interception.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
