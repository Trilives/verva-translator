use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfile {
    pub id: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub model: String,
    pub thinking: ThinkingLevel,
    pub long_conversation: bool,
    pub context_limit: u64,
}

/// How much reasoning to request from the model, chosen per profile. Higher
/// levels trade tokens (and latency and cost) for more careful translation.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ThinkingLevel {
    #[default]
    Off,
    Low,
    Medium,
    High,
}

impl ThinkingLevel {
    /// Claude extended-thinking budget in tokens, or `None` when disabled.
    pub fn claude_budget(self) -> Option<u32> {
        match self {
            ThinkingLevel::Off => None,
            ThinkingLevel::Low => Some(1024),
            ThinkingLevel::Medium => Some(2048),
            ThinkingLevel::High => Some(4096),
        }
    }

    /// OpenAI `reasoning_effort` value, or `None` when disabled.
    pub fn openai_effort(self) -> Option<&'static str> {
        match self {
            ThinkingLevel::Off => None,
            ThinkingLevel::Low => Some("low"),
            ThinkingLevel::Medium => Some("medium"),
            ThinkingLevel::High => Some("high"),
        }
    }
}

/// Accepts both the graduated string form written by the current UI and the
/// plain boolean older builds stored, so settings survive an upgrade in place.
/// The retired `true` toggle requested the budget that "Medium" now names.
impl<'de> Deserialize<'de> for ThinkingLevel {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Raw {
            Flag(bool),
            Name(String),
        }
        Ok(match Raw::deserialize(deserializer)? {
            Raw::Flag(true) => ThinkingLevel::Medium,
            Raw::Flag(false) => ThinkingLevel::Off,
            Raw::Name(name) => match name.as_str() {
                "off" => ThinkingLevel::Off,
                "low" => ThinkingLevel::Low,
                "medium" => ThinkingLevel::Medium,
                "high" => ThinkingLevel::High,
                other => {
                    return Err(serde::de::Error::custom(format!(
                        "unknown thinking level: {other}"
                    )))
                }
            },
        })
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn level(json: &str) -> ThinkingLevel {
        serde_json::from_str(json).expect("thinking level should deserialize")
    }

    /// Settings written before the graduated control stored a plain flag; both
    /// forms must load, and the retired `true` must land on the budget it used
    /// to request rather than the new maximum.
    #[test]
    fn accepts_both_the_legacy_flag_and_the_named_level() {
        assert_eq!(level("true"), ThinkingLevel::Medium);
        assert_eq!(level("false"), ThinkingLevel::Off);
        assert_eq!(level("\"off\""), ThinkingLevel::Off);
        assert_eq!(level("\"low\""), ThinkingLevel::Low);
        assert_eq!(level("\"medium\""), ThinkingLevel::Medium);
        assert_eq!(level("\"high\""), ThinkingLevel::High);
    }

    #[test]
    fn rejects_an_unknown_level() {
        assert!(serde_json::from_str::<ThinkingLevel>("\"extreme\"").is_err());
    }

    /// Off must send nothing to either provider; every other level must resolve
    /// to a budget above the reply floor Claude requires.
    #[test]
    fn maps_each_level_to_provider_settings() {
        assert_eq!(ThinkingLevel::Off.claude_budget(), None);
        assert_eq!(ThinkingLevel::Off.openai_effort(), None);
        assert_eq!(ThinkingLevel::High.claude_budget(), Some(4096));
        assert_eq!(ThinkingLevel::High.openai_effort(), Some("high"));
    }
}
