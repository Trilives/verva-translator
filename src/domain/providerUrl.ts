function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  return first === 10 || first === 127 || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isPrivateIpv6(hostname: string): boolean {
  const first = Number.parseInt(hostname.split(":")[0] || "0", 16);
  return hostname === "::1" || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
}

export function isLanBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = normalizedHost(url.hostname);
    return ["http:", "https:"].includes(url.protocol)
      && (host === "localhost" || isPrivateIpv4(host) || isPrivateIpv6(host));
  } catch { return false; }
}

export function isAllowedProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && isLanBaseUrl(value));
  } catch { return false; }
}
