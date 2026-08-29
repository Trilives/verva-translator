use serde_json::Value;

pub(super) async fn check_response(
    status: reqwest::StatusCode,
    body: Option<String>,
) -> Result<(), String> {
    if status.is_success() {
        return Ok(());
    }
    let detail = body
        .as_deref()
        .and_then(|text| serde_json::from_str::<Value>(text).ok())
        .and_then(|value| {
            value
                .pointer("/error/message")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .or(body)
        .unwrap_or_default();
    Err(if detail.is_empty() {
        format!("Provider returned {status}")
    } else {
        format!("Provider returned {status}: {detail}")
    })
}

pub fn redact(message: &str, api_key: &str) -> String {
    let trimmed = api_key.trim();
    let cleaned = if trimmed.len() >= 8 {
        message.replace(trimmed, "***")
    } else {
        message.to_owned()
    };
    if cleaned.chars().count() > 400 {
        cleaned.chars().take(400).collect::<String>() + "…"
    } else {
        cleaned
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redaction_removes_the_key_and_bounds_length() {
        let key = "sk-secret-value-1234";
        let cleaned = redact(&format!("401 from provider using {key}"), key);
        assert!(!cleaned.contains(key));
        assert!(cleaned.contains("***"));
        assert!(redact(&"x".repeat(900), key).chars().count() <= 401);
    }

    #[test]
    fn redaction_ignores_implausibly_short_keys() {
        assert_eq!(redact("the model is gpt", "the"), "the model is gpt");
    }
}
