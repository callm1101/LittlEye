const activityEndpoint = "http://127.0.0.1:47831/activity";
const configEndpoint = "http://127.0.0.1:47831/config";
const registrationId = "littleye-whitelist-monitor";
let activePage;

function desktopHeaders(pairingToken, includeContentType = false) {
  const headers = {
    "X-LittleEye-Token": pairingToken,
    "X-LittleEye-Extension-Origin": chrome.runtime.getURL("").replace(/\/$/, "")
  };
  if (includeContentType) headers["Content-Type"] = "application/json";
  return headers;
}

function normalizeDomain(value) {
  const domain = String(value ?? "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!domain || domain.length > 253 || domain.includes("*")) return undefined;
  const labels = domain.split(".");
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return undefined;
  return domain;
}

function normalizeDomains(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(normalizeDomain).filter(Boolean))].slice(0, 32);
}

function matchingConfiguredDomain(hostname, domains) {
  const host = hostname.toLowerCase();
  return domains.find(domain => host === domain || host.endsWith(`.${domain}`));
}

function originPatterns(domains) {
  return domains.flatMap(domain => [
    `http://${domain}/*`,
    `https://${domain}/*`,
    `http://*.${domain}/*`,
    `https://*.${domain}/*`
  ]);
}

async function fetchDesktopConfig(pairingToken) {
  if (!pairingToken) return { ok: false, reason: "missing-token" };
  try {
    const response = await fetch(configEndpoint, { headers: desktopHeaders(pairingToken) });
    if (!response.ok) return { ok: false, reason: `http-${response.status}` };
    const value = await response.json();
    const domains = normalizeDomains(value.domains);
    return domains.length ? { ok: true, domains } : { ok: false, reason: "empty-whitelist" };
  } catch {
    return { ok: false, reason: "desktop-unavailable" };
  }
}

async function permittedDomains(domains) {
  const permitted = [];
  for (const domain of domains) {
    if (await chrome.permissions.contains({ origins: originPatterns([domain]) })) permitted.push(domain);
  }
  return permitted;
}

async function syncRegisteredScripts(domains) {
  try { await chrome.scripting.unregisterContentScripts({ ids: [registrationId] }); } catch { /* No prior registration. */ }
  const permitted = await permittedDomains(normalizeDomains(domains));
  if (!permitted.length) return;
  await chrome.scripting.registerContentScripts([{
    id: registrationId,
    matches: originPatterns(permitted),
    js: ["src/content.js"],
    persistAcrossSessions: true,
    runAt: "document_idle"
  }]);
}

function isValidActivityEvent(event) {
  return event && Object.keys(event).sort().join(",") === "active,at,type"
    && event.type === "site-activity"
    && typeof event.active === "boolean"
    && Number.isSafeInteger(event.at);
}

async function forwardActivity(active, at, domain) {
  const { pairingToken } = await chrome.storage.local.get("pairingToken");
  if (!pairingToken) return { ok: false, reason: "missing-token" };
  try {
    const response = await fetch(activityEndpoint, {
      method: "POST",
      headers: desktopHeaders(pairingToken, true),
      body: JSON.stringify({ active, at, domain })
    });
    const result = { ok: response.ok, reason: response.ok ? "connected" : `http-${response.status}`, checkedAt: Date.now() };
    await chrome.storage.local.set({ connectionStatus: result });
    return result;
  } catch {
    const result = { ok: false, reason: "desktop-unavailable", checkedAt: Date.now() };
    await chrome.storage.local.set({ connectionStatus: result });
    return result;
  }
}

async function handleActivity(event, sender) {
  if (!sender.tab?.id || !sender.origin || !isValidActivityEvent(event)) return { ok: false };
  const { allowedDomains = [] } = await chrome.storage.local.get("allowedDomains");
  let hostname;
  try { hostname = new URL(sender.origin).hostname; } catch { return { ok: false }; }
  const domain = matchingConfiguredDomain(hostname, normalizeDomains(allowedDomains));
  if (!domain) return { ok: false };

  if (event.active) {
    activePage = { tabId: sender.tab.id, domain };
    return forwardActivity(true, event.at, domain);
  }
  if (activePage?.tabId !== sender.tab.id) return { ok: true };
  const previousDomain = activePage.domain;
  activePage = undefined;
  return forwardActivity(false, event.at, previousDomain);
}

chrome.runtime.onMessage.addListener((event, sender, sendResponse) => {
  if (event?.type === "read-desktop-config" && sender.id === chrome.runtime.id) {
    void fetchDesktopConfig(event.pairingToken).then(sendResponse);
    return true;
  }
  if (event?.type === "sync-whitelist" && sender.id === chrome.runtime.id) {
    const domains = normalizeDomains(event.domains);
    void chrome.storage.local.set({ allowedDomains: domains })
      .then(() => syncRegisteredScripts(domains))
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  void handleActivity(event, sender).then(sendResponse);
  return true;
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (activePage?.tabId !== tabId) return;
  const domain = activePage.domain;
  activePage = undefined;
  void forwardActivity(false, Date.now(), domain);
});

async function restoreRegistration() {
  const { allowedDomains = [] } = await chrome.storage.local.get("allowedDomains");
  await syncRegisteredScripts(allowedDomains);
}

void restoreRegistration();
