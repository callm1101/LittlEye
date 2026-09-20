export const defaultBrowserDomains = ["bilibili.com", "xiaohongshu.com"];

export function normalizeDomain(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes("*")) return undefined;

  let hostname = trimmed;
  try {
    hostname = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return undefined;
  }

  hostname = hostname.replace(/^\.+|\.+$/g, "");
  if (hostname.length > 253) return undefined;
  const labels = hostname.split(".");
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return undefined;
  return hostname;
}

export function normalizeDomainList(values: string[]): string[] {
  return [...new Set(values.map(normalizeDomain).filter((value): value is string => Boolean(value)))].slice(0, 32);
}

export function parseStoredDomains(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultBrowserDomains;
    const domains = normalizeDomainList(parsed.filter(item => typeof item === "string"));
    return domains.length ? domains : defaultBrowserDomains;
  } catch {
    return defaultBrowserDomains;
  }
}
