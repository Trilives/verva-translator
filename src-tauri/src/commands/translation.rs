use super::secrets::secret_key;
use crate::{
    history,
    models::{
        ConversationTurn, HistoryEntry, ProviderProfile, TranslationChunk, TranslationRequest,
    },
    providers,
    state::AppState,
};
use chrono::Utc;
use serde::Deserialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;
use zeroize::Zeroizing;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredSettings {
    profiles: Vec<ProviderProfile>,
}

#[tauri::command]
pub fn start_translation(
    app: AppHandle,
    state: State<'_, AppState>,
    request: TranslationRequest,
) -> Result<(), String> {
    let profile = load_profile(&app, &request.profile_id)?;
    let key_bytes = state
        .secrets
        .get(&secret_key(&profile.id))?
        .ok_or("No API key is stored for this configuration")?;
    let api_key =
        Zeroizing::new(String::from_utf8(key_bytes).map_err(|_| "The stored API key is invalid")?);
    let cancelled = Arc::new(AtomicBool::new(false));
    state
        .cancellations
        .insert(request.request_id.clone(), cancelled.clone());
    tauri::async_runtime::spawn(run_translation(
        app.clone(),
        profile,
        request,
        api_key,
        cancelled,
    ));
    Ok(())
}

async fn run_translation(
    app: AppHandle,
    profile: ProviderProfile,
    request: TranslationRequest,
    api_key: Zeroizing<String>,
    cancelled: Arc<AtomicBool>,
) {
    let state = app.state::<AppState>();
    let prompt = providers::build_user_prompt(
        &request.source_language,
        &request.target_language,
        &request.style,
        &request.custom_style,
        &request.source_text,
    );
    let previous = request
        .session_id
        .as_ref()
        .and_then(|id| state.sessions.lock().ok()?.get(id).cloned())
        .unwrap_or_default();
    let token_estimate = estimate_tokens(&prompt, &previous);
    let mut decoder = ProtocolDecoder::default();
    let mut translated = String::new();
    let result = providers::stream_translation(
        &state.client,
        &profile,
        &api_key,
        &previous,
        &prompt,
        cancelled.clone(),
        |delta| {
            if let Some((text, language)) = decoder.push(&delta) {
                translated.push_str(&text);
                emit_chunk(
                    &app,
                    &request.request_id,
                    text,
                    language,
                    Some(token_estimate),
                    false,
                    None,
                );
            }
        },
    )
    .await;
    if let Some((text, language)) = decoder.finish() {
        translated.push_str(&text);
        emit_chunk(
            &app,
            &request.request_id,
            text,
            language,
            Some(token_estimate),
            false,
            None,
        );
    }
    match result {
        Err(error) => emit_chunk(
            &app,
            &request.request_id,
            String::new(),
            None,
            None,
            true,
            Some(error),
        ),
        Ok(()) => {
            if !cancelled.load(Ordering::Relaxed) {
                complete_translation(
                    &state,
                    &profile,
                    &request,
                    &prompt,
                    &translated,
                    decoder.language.clone(),
                );
            }
            emit_chunk(
                &app,
                &request.request_id,
                String::new(),
                decoder.language,
                Some(token_estimate),
                true,
                None,
            );
        }
    }
    state.cancellations.remove(&request.request_id);
}

fn estimate_tokens(prompt: &str, history: &[ConversationTurn]) -> u64 {
    ((prompt.len()
        + history
            .iter()
            .map(|turn| turn.user.len() + turn.assistant.len())
            .sum::<usize>())
        / 4) as u64
}

fn complete_translation(
    state: &AppState,
    profile: &ProviderProfile,
    request: &TranslationRequest,
    prompt: &str,
    translated: &str,
    detected: Option<String>,
) {
    remember_turn(state, profile, request, prompt, translated);
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        created_at: Utc::now().to_rfc3339(),
        source_language: detected.unwrap_or_else(|| request.source_language.clone()),
        target_language: request.target_language.clone(),
        source_text: request.source_text.clone(),
        translated_text: translated.to_owned(),
        style: request.style.clone(),
    };
    let _ = history::append(&state.secrets, entry);
}

fn remember_turn(
    state: &AppState,
    profile: &ProviderProfile,
    request: &TranslationRequest,
    prompt: &str,
    translated: &str,
) {
    if !profile.long_conversation {
        return;
    }
    let Some(id) = &request.session_id else {
        return;
    };
    let Ok(mut sessions) = state.sessions.lock() else {
        return;
    };
    let turns = sessions.entry(id.clone()).or_default();
    turns.push(ConversationTurn {
        user: prompt.to_owned(),
        assistant: translated.to_owned(),
    });
    while estimate_tokens("", turns) > profile.context_limit * 9 / 10 && turns.len() > 1 {
        turns.remove(0);
    }
}

#[tauri::command]
pub fn cancel_translation(state: State<'_, AppState>, request_id: String) {
    if let Some(flag) = state.cancellations.get(&request_id) {
        flag.store(true, Ordering::Relaxed);
    }
}

fn load_profile(app: &AppHandle, id: &str) -> Result<ProviderProfile, String> {
    let store = app
        .store("settings.json")
        .map_err(|error| error.to_string())?;
    let value = store
        .get("app-settings")
        .ok_or("Settings have not been initialized")?;
    serde_json::from_value::<StoredSettings>(value)
        .map_err(|error| error.to_string())?
        .profiles
        .into_iter()
        .find(|profile| profile.id == id)
        .ok_or_else(|| "The selected configuration no longer exists".into())
}

fn emit_chunk(
    app: &AppHandle,
    request_id: &str,
    text: String,
    language: Option<String>,
    tokens: Option<u64>,
    done: bool,
    error: Option<String>,
) {
    let _ = app.emit(
        "translation-chunk",
        TranslationChunk {
            request_id: request_id.into(),
            text,
            detected_language: language,
            input_tokens: tokens,
            done,
            error,
        },
    );
}

#[derive(Default)]
struct ProtocolDecoder {
    pending: String,
    language: Option<String>,
    marker_done: bool,
}

impl ProtocolDecoder {
    fn push(&mut self, delta: &str) -> Option<(String, Option<String>)> {
        if self.marker_done {
            return Some((delta.to_owned(), None));
        }
        self.pending.push_str(delta);
        let newline = self.pending.find('\n')?;
        let first = self.pending[..newline].trim().to_owned();
        let remaining = self.pending[newline + 1..].to_owned();
        self.pending.clear();
        self.marker_done = true;
        if let Some(value) = first
            .strip_prefix("[[LANGUAGE:")
            .and_then(|value| value.strip_suffix("]]"))
        {
            self.language = Some(value.trim().to_owned());
        } else {
            return Some((format!("{first}\n{remaining}"), None));
        }
        Some((remaining, self.language.clone()))
    }

    fn finish(&mut self) -> Option<(String, Option<String>)> {
        (!self.pending.is_empty())
            .then(|| (std::mem::take(&mut self.pending), self.language.clone()))
    }
}
