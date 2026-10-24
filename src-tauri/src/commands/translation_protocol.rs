#[derive(Default)]
pub(super) struct ProtocolDecoder {
    pending: String,
    pub language: Option<String>,
    marker_done: bool,
}

impl ProtocolDecoder {
    pub fn new(direct_output: bool) -> Self {
        Self {
            marker_done: direct_output,
            ..Self::default()
        }
    }

    pub fn push(&mut self, delta: &str) -> Option<(String, Option<String>)> {
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

    pub fn finish(&mut self) -> Option<(String, Option<String>)> {
        (!self.pending.is_empty())
            .then(|| (std::mem::take(&mut self.pending), self.language.clone()))
    }
}

#[cfg(test)]
mod tests {
    use super::ProtocolDecoder;

    #[test]
    fn direct_output_streams_without_waiting_for_a_language_marker() {
        let mut decoder = ProtocolDecoder::new(true);
        assert_eq!(decoder.push("Hello"), Some(("Hello".into(), None)));
        assert_eq!(decoder.push(" world"), Some((" world".into(), None)));
    }
}
