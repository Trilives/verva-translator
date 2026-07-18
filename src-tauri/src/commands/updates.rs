use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub fn install_mode(app: AppHandle) -> String {
    let installed = app
        .path()
        .executable_dir()
        .map(|path| path.join(".verva-installed").is_file())
        .unwrap_or(false);
    if installed { "installed" } else { "portable" }.into()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    available: bool,
    version: Option<String>,
    body: Option<String>,
    installed: bool,
}

#[tauri::command]
pub async fn check_update(
    app: AppHandle,
    channel: String,
    install: bool,
) -> Result<UpdateInfo, String> {
    let channel = if channel == "beta" { "beta" } else { "stable" };
    let endpoint = tauri::Url::parse(&format!(
        "https://github.com/Trilives/verva-translator/releases/download/updater-{channel}/latest.json"
    ))
    .map_err(|error| error.to_string())?;
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|error| error.to_string())?
        .build()
        .map_err(|error| error.to_string())?;
    let Some(update) = updater.check().await.map_err(|error| error.to_string())? else {
        return Ok(UpdateInfo {
            available: false,
            version: None,
            body: None,
            installed: false,
        });
    };
    let version = Some(update.version.clone());
    let body = update.body.clone();
    let installed = install && install_mode(app.clone()) == "installed";
    if installed {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|error| error.to_string())?;
    }
    Ok(UpdateInfo {
        available: true,
        version,
        body,
        installed,
    })
}
