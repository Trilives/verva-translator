use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfile {
    pub id: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub model: String,
    pub thinking: bool,
    pub long_conversation: bool,
    pub context_limit: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    Openai,
    Claude,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationRequest {
    pub request_id: String,
    pub profile_id: String,
    pub source_language: String,
    pub target_language: String,
    pub source_text: String,
    pub style: String,
    pub custom_style: String,
    pub session_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationChunk {
    pub request_id: String,
    pub text: String,
    pub detected_language: Option<String>,
    pub input_tokens: Option<u64>,
    pub done: bool,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub created_at: String,
    pub source_language: String,
    pub target_language: String,
    pub source_text: String,
    pub translated_text: String,
    pub style: String,
}

#[derive(Clone, Debug)]
pub struct ConversationTurn {
    pub user: String,
    pub assistant: String,
}
