mod commands;
mod history;
mod models;
mod providers;
mod security;
mod state;
mod tray;

use state::AppState;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_store::StoreExt;

/// What the window's close button does. Mirrors `closeBehavior` in settings.
fn close_behaviour(app: &tauri::AppHandle) -> String {
    app.store("settings.json")
        .ok()
        .and_then(|store| store.get("app-settings"))
        .and_then(|value| {
            value
                .get("closeBehavior")
                .and_then(|v| v.as_str())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| "ask".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            tray::show_main(app);
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
            tray::build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                match close_behaviour(window.app_handle()).as_str() {
                    // Let the close through; the app exits normally.
                    "exit" => {}
                    "tray" => {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    // "ask" and anything unrecognised: let the UI decide.
                    _ => {
                        api.prevent_close();
                        let _ = window.emit("close-requested", ());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::secrets::save_api_key,
            commands::secrets::has_api_key,
            commands::secrets::delete_api_key,
            commands::translation::start_translation,
            commands::translation::cancel_translation,
            commands::history::list_history,
            commands::history::clear_history,
            commands::updates::install_mode,
            commands::updates::check_update,
            commands::diagnostics::test_profile,
            commands::window_state::hide_to_tray,
            commands::window_state::quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Verva Translate");
}
