const endpoint = "http://127.0.0.1:47831/activity";

function isAllowedSender(sender) {
  try {
    const host = new URL(sender.url).hostname;
    return host === "bilibili.com" || host.endsWith(".bilibili.com");
  } catch {
    return false;
  }
}

function isValidActivityEvent(event) {
  return event && Object.keys(event).sort().join(",") === "active,at,type"
    && event.type === "site-activity"
    && typeof event.active === "boolean"
    && Number.isSafeInteger(event.at);
}

async function forwardActivity(active, at) {
  const { pairingToken } = await chrome.storage.local.get("pairingToken");
  if (!pairingToken) return { ok: false, reason: "missing-token" };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-LittleEye-Token": pairingToken },
      body: JSON.stringify({ active, at })
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

chrome.runtime.onMessage.addListener((event, sender, sendResponse) => {
  if (event?.type === "pairing-test" && sender.id === chrome.runtime.id) {
    void forwardActivity(false, Date.now()).then(sendResponse);
    return true;
  }
  if (!isAllowedSender(sender) || !isValidActivityEvent(event)) return false;
  void forwardActivity(event.active, event.at).then(sendResponse);
  return true;
});
