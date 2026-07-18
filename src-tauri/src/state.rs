use crate::{models::ConversationTurn, security};
use dashmap::DashMap;
use std::{
    collections::HashMap,
    sync::{atomic::AtomicBool, Arc, Mutex},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_stronghold::stronghold::Stronghold;

const CLIENT: &[u8] = b"verva-native";

pub struct SecretVault {
    stronghold: Mutex<Stronghold>,
}

impl SecretVault {
    fn new(app: &AppHandle) -> Result<Self, String> {
        let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let master = security::load_or_create_master(&dir.join("stronghold-master.dpapi"))?;
        let stronghold =
            Stronghold::new(dir.join("secrets.hold"), master).map_err(|e| e.to_string())?;
        if stronghold.load_client(CLIENT).is_err() {
            stronghold
                .create_client(CLIENT)
                .map_err(|e| e.to_string())?;
        }
        Ok(Self {
            stronghold: Mutex::new(stronghold),
        })
    }

    pub fn get(&self, key: &str) -> Result<Option<Vec<u8>>, String> {
        let vault = self
            .stronghold
            .lock()
            .map_err(|_| "Stronghold lock poisoned")?;
        vault
            .get_client(CLIENT)
            .map_err(|e| e.to_string())?
            .store()
            .get(key.as_bytes())
            .map_err(|e| e.to_string())
    }

    pub fn set(&self, key: &str, value: Vec<u8>) -> Result<(), String> {
        let vault = self
            .stronghold
            .lock()
            .map_err(|_| "Stronghold lock poisoned")?;
        vault
            .get_client(CLIENT)
            .map_err(|e| e.to_string())?
            .store()
            .insert(key.as_bytes().to_vec(), value, None)
            .map_err(|e| e.to_string())?;
        vault.save().map_err(|e| e.to_string())
    }

    pub fn remove(&self, key: &str) -> Result<(), String> {
        let vault = self
            .stronghold
            .lock()
            .map_err(|_| "Stronghold lock poisoned")?;
        let _ = vault
            .get_client(CLIENT)
            .map_err(|e| e.to_string())?
            .store()
            .delete(key.as_bytes())
            .map_err(|e| e.to_string())?;
        vault.save().map_err(|e| e.to_string())
    }
}

pub struct AppState {
    pub secrets: SecretVault,
    pub cancellations: DashMap<String, Arc<AtomicBool>>,
    pub sessions: Mutex<HashMap<String, Vec<ConversationTurn>>>,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            secrets: SecretVault::new(app).map_err(std::io::Error::other)?,
            cancellations: DashMap::new(),
            sessions: Mutex::new(HashMap::new()),
            client: reqwest::Client::builder()
                .https_only(false)
                .user_agent("Verva-Translate/0.2")
                .build()?,
        })
    }
}
