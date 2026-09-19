// Deliberately sends only visibility/focus state and a timestamp. Page content is never read.
let lastActive;

function isActive() {
  return document.visibilityState === "visible" && document.hasFocus();
}

function report(force = false) {
  const active = isActive();
  if (!force && active === lastActive) return;
  lastActive = active;
  chrome.runtime.sendMessage({ type: "site-activity", active, at: Date.now() });
}

document.addEventListener("visibilitychange", () => report(true));
window.addEventListener("focus", () => report(true));
window.addEventListener("blur", () => report(true));
window.addEventListener("pagehide", () => {
  chrome.runtime.sendMessage({ type: "site-activity", active: false, at: Date.now() });
});
window.setInterval(() => report(true), 10_000);
report(true);
