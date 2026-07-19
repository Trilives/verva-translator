use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Directory holding the running executable.
///
/// `PathResolver::executable_dir` is the XDG "user's executables" location and
/// resolves to nothing on Windows, so it never found the NSIS marker and every
/// build reported itself as portable and refused to self-update.
fn install_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(Path::to_path_buf)
}

fn is_installed() -> bool {
    install_dir().is_some_and(|dir| dir.join(".verva-installed").is_file())
}

#[tauri::command]
pub fn install_mode() -> String {
    let mode = if is_installed() {
        "installed"
    } else {
        "portable"
    };
    mode.into()
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
    let installed = install && is_installed();
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

#[cfg(test)]
mod tests {
    use super::install_dir;

    /// Regression: the marker written by the NSIS hook sits beside the running
    /// executable, so resolution must succeed on Windows. The previous
    /// `executable_dir()` lookup returned `None` here and pinned every build to
    /// portable mode.
    #[test]
    fn resolves_the_directory_holding_the_executable() {
        let dir = install_dir().expect("executable directory must resolve");
        assert!(dir.is_dir());
        assert_eq!(
            std::env::current_exe().unwrap().parent().unwrap(),
            dir.as_path()
        );
    }
}
