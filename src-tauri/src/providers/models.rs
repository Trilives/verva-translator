use crate::models::{ProviderKind, ProviderProfile};
use serde_json::Value;
use std::collections::BTreeSet;

const MAX_RESPONSE_BYTES: usize = 1024 * 1024;

pub async fn list(
    client: &reqwest::Client,
    profile: &ProviderProfile,
    key: &str,
) -> Result<Vec<String>, String> {
    let mut request = client.get(endpoint(&profile.base_url, &profile.kind));
    if !key.is_empty() {
        request = match profile.kind {
            ProviderKind::Openai => request.bearer_auth(key),
            ProviderKind::Claude => request.header("x-api-key", key),
        };
    }
    if matches!(profile.kind, ProviderKind::Claude) {
        request = request.header("anthropic-version", "2023-06-01");
    }
    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("Provider returned {status}"));
    }
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("The provider model list is too large".into());
    }
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|_| "The provider returned an invalid model list")?;
    Ok(parse_models(&value))
}

fn endpoint(base: &str, kind: &ProviderKind) -> String {
    let base = base.trim_end_matches('/');
    match kind {
        ProviderKind::Openai if base.ends_with("/chat/completions") => {
            format!("{}/models", base.trim_end_matches("/chat/completions"))
        }
        ProviderKind::Openai => format!("{base}/models"),
        ProviderKind::Claude if base.ends_with("/v1/messages") => {
            format!("{}/models", base.trim_end_matches("/messages"))
        }
        ProviderKind::Claude if base.ends_with("/v1") => format!("{base}/models"),
        ProviderKind::Claude => format!("{base}/v1/models"),
    }
}

fn parse_models(value: &Value) -> Vec<String> {
    let items = value
        .get("data")
        .or_else(|| value.get("models"))
        .and_then(Value::as_array);
    let mut models = BTreeSet::new();
    for item in items.into_iter().flatten() {
        let name = item
            .as_str()
            .or_else(|| item.get("id").and_then(Value::as_str))
            .or_else(|| item.get("model").and_then(Value::as_str))
            .or_else(|| item.get("name").and_then(Value::as_str));
        if let Some(name) = name.filter(|name| !name.trim().is_empty()) {
            models.insert(name.to_owned());
        }
    }
    models.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_provider_model_endpoints() {
        assert_eq!(
            endpoint("http://10.0.0.2:11434/v1", &ProviderKind::Openai),
            "http://10.0.0.2:11434/v1/models"
        );
        assert_eq!(
            endpoint("https://api.anthropic.com", &ProviderKind::Claude),
            "https://api.anthropic.com/v1/models"
        );
        assert_eq!(
            endpoint("https://example.test/v1/messages", &ProviderKind::Claude),
            "https://example.test/v1/models"
        );
    }

    #[test]
    fn parses_common_model_list_shapes() {
        let openai = serde_json::json!({"data":[{"id":"gpt-b"},{"id":"gpt-a"}]});
        let local = serde_json::json!({"models":[{"name":"local-model"},"manual-model"]});
        assert_eq!(parse_models(&openai), vec!["gpt-a", "gpt-b"]);
        assert_eq!(parse_models(&local), vec!["local-model", "manual-model"]);
    }
}
