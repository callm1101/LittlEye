const tokenInput = document.querySelector("#token");
const domainsInput = document.querySelector("#domains");
const authorizeButton = document.querySelector("#authorize");
const status = document.querySelector("#status");
let pendingDomains = [];

function originPatterns(domains) {
  return domains.flatMap(domain => [
    `http://${domain}/*`,
    `https://${domain}/*`,
    `http://*.${domain}/*`,
    `https://*.${domain}/*`
  ]);
}

function showDomains(domains) {
  pendingDomains = Array.isArray(domains) ? domains : [];
  domainsInput.value = pendingDomains.join("\n");
  authorizeButton.disabled = pendingDomains.length === 0;
}

async function load() {
  const values = await chrome.storage.local.get(["pairingToken", "connectionStatus", "allowedDomains"]);
  tokenInput.value = values.pairingToken ?? "";
  showDomains(values.allowedDomains ?? []);
  if (values.connectionStatus?.ok) status.textContent = "上次连接成功";
}

document.querySelector("#save").addEventListener("click", async () => {
  const pairingToken = tokenInput.value.trim();
  if (pairingToken.length < 24) { status.textContent = "令牌格式不正确"; return; }
  await chrome.storage.local.set({ pairingToken });
  status.textContent = "正在读取桌面端白名单…";
  const result = await chrome.runtime.sendMessage({ type: "read-desktop-config", pairingToken });
  if (!result?.ok) {
    status.textContent = "连接失败，请确认桌面端已运行并启用网站浏览提醒";
    return;
  }
  showDomains(result.domains);
  status.textContent = "白名单已读取，请继续确认网站权限";
});

authorizeButton.addEventListener("click", async () => {
  const origins = originPatterns(pendingDomains);
  const granted = await chrome.permissions.request({ origins });
  if (!granted) { status.textContent = "未获得网站权限，白名单没有变更"; return; }

  const { allowedDomains: previousDomains = [] } = await chrome.storage.local.get("allowedDomains");
  const result = await chrome.runtime.sendMessage({ type: "sync-whitelist", domains: pendingDomains });
  if (!result?.ok) {
    const newlyAddedDomains = pendingDomains.filter(domain => !previousDomains.includes(domain));
    if (newlyAddedDomains.length) await chrome.permissions.remove({ origins: originPatterns(newlyAddedDomains) });
    status.textContent = "白名单注册失败，请重新加载扩展后再试";
    return;
  }

  const removedDomains = previousDomains.filter(domain => !pendingDomains.includes(domain));
  if (removedDomains.length) await chrome.permissions.remove({ origins: originPatterns(removedDomains) });
  status.textContent = "白名单已同步；请刷新已打开的白名单网页";
});

void load();
