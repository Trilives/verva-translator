use crate::{models::HistoryEntry, state::SecretVault};

const HISTORY_KEY: &str = "history-v1";

pub fn list(vault: &SecretVault) -> Result<Vec<HistoryEntry>, String> {
    match vault.get(HISTORY_KEY)? {
        Some(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        None => Ok(Vec::new()),
    }
}

pub fn append(vault: &SecretVault, entry: HistoryEntry) -> Result<(), String> {
    let mut items = list(vault)?;
    items.insert(0, entry);
    items.truncate(100);
    vault.set(
        HISTORY_KEY,
        serde_json::to_vec(&items).map_err(|e| e.to_string())?,
    )
}

pub fn clear(vault: &SecretVault) -> Result<(), String> {
    vault.remove(HISTORY_KEY)
}
