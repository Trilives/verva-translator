use std::net::IpAddr;

pub(super) fn validate(value: &str) -> Result<(), String> {
    let url = reqwest::Url::parse(value).map_err(|_| "The provider Base URL is invalid")?;
    if url.scheme() != "https" && !(url.scheme() == "http" && is_lan_host(url.host_str())) {
        return Err("Public provider endpoints must use HTTPS".into());
    }
    Ok(())
}

pub(crate) fn is_lan(value: &str) -> bool {
    reqwest::Url::parse(value)
        .ok()
        .filter(|url| matches!(url.scheme(), "http" | "https"))
        .is_some_and(|url| is_lan_host(url.host_str()))
}

fn is_lan_host(host: Option<&str>) -> bool {
    let Some(host) = host else { return false };
    let host = host
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(host);
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }
    match host.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => ip.is_loopback() || ip.is_private() || ip.is_link_local(),
        Ok(IpAddr::V6(ip)) => {
            ip.is_loopback()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip
                    .to_ipv4_mapped()
                    .is_some_and(|v4| v4.is_loopback() || v4.is_private() || v4.is_link_local())
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_policy() {
        for url in [
            "http://localhost:11434/v1",
            "http://10.0.0.8:8000/v1",
            "http://172.31.4.2/v1",
            "http://192.168.1.20:11434/v1",
            "http://169.254.2.3/v1",
            "http://[fd12::8]:8080/v1",
            "http://[fe80::1]:8080/v1",
        ] {
            assert!(validate(url).is_ok(), "{url} should be allowed");
        }
        assert!(validate("https://api.example.com/v1").is_ok());
        assert!(validate("http://example.com/v1").is_err());
        assert!(validate("http://8.8.8.8/v1").is_err());
    }
}
