import { describe, expect, it } from "vitest";
import { isAllowedProviderUrl, isLanBaseUrl } from "./providerUrl";

describe("provider URL policy", () => {
  it.each([
    "http://localhost:11434/v1", "http://127.0.0.1:1234/v1",
    "http://10.0.0.8:8000/v1", "http://172.16.5.4/v1",
    "http://192.168.1.20:11434/v1", "http://169.254.2.3/v1",
    "http://[fd12::8]:8080/v1", "http://[fe80::1]:8080/v1"
  ])("allows a local or LAN HTTP endpoint: %s", (url) => {
    expect(isAllowedProviderUrl(url)).toBe(true);
    expect(isLanBaseUrl(url)).toBe(true);
  });

  it.each(["http://example.com/v1", "http://8.8.8.8/v1", "ftp://192.168.1.20/model", "not a URL"])
    ("rejects an unsafe or invalid endpoint: %s", (url) => expect(isAllowedProviderUrl(url)).toBe(false));

  it("allows public HTTPS without treating it as LAN", () => {
    expect(isAllowedProviderUrl("https://api.example.com/v1")).toBe(true);
    expect(isLanBaseUrl("https://api.example.com/v1")).toBe(false);
  });
});
