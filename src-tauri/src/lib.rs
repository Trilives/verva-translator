mod commands;
mod history;
mod models;
mod providers;
mod security;
mod state;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                security::hash_password(password.as_bytes())
            })
            .build(),
        )
        .setup(|app| {
            let state = AppState::new(app.handle())?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::windows::open_settings_window,
            commands::windows::close_settings_window,
            commands::secrets::save_api_key,
            commands::secrets::has_api_key,
            commands::secrets::delete_api_key,
            commands::translation::start_translation,
            commands::translation::cancel_translation,
            commands::history::list_history,
            commands::history::clear_history,
            commands::updates::install_mode,
            commands::updates::check_update
        ])
        .on_window_event(|window, event| {
            if window.label() == "settings"
                && matches!(event, tauri::WindowEvent::CloseRequested { .. })
            {
                let _ = window.emit("settings-closing", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Verva Translate");
}
