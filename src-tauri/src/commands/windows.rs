use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Must stay `async`. Tauri runs synchronous commands on the main thread, and
/// building a webview window there deadlocks on Windows: the shell is created
/// but `build()` never returns, so the webview stays on `about:blank` and the
/// window renders as a blank white surface. Running on the async runtime lets
/// the builder dispatch to the main thread and complete normally.
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|error| error.to_string())?;
        return window.set_focus().map_err(|error| error.to_string());
    }
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("index.html".into()))
        .title("Settings - Verva Translate")
        .inner_size(820.0, 700.0)
        .min_inner_size(720.0, 580.0)
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
