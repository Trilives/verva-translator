use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|error| error.to_string())?;
        return window.set_focus().map_err(|error| error.to_string());
    }
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("index.html".into()))
        .title("Settings - Verva Translate")
        .inner_size(780.0, 680.0)
        .min_inner_size(680.0, 560.0)
        .center()
        .decorations(false)
        .resizable(true)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn close_settings_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}
