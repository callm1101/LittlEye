const tokenInput = document.querySelector("#token");
const status = document.querySelector("#status");

async function load() {
  const values = await chrome.storage.local.get(["pairingToken", "connectionStatus"]);
  tokenInput.value = values.pairingToken ?? "";
  if (values.connectionStatus?.ok) status.textContent = "上次连接成功";
}

document.querySelector("#save").addEventListener("click", async () => {
  const pairingToken = tokenInput.value.trim();
  if (pairingToken.length < 24) { status.textContent = "令牌格式不正确"; return; }
  await chrome.storage.local.set({ pairingToken });
  status.textContent = "正在连接…";
  const result = await chrome.runtime.sendMessage({ type: "pairing-test" });
  status.textContent = result?.ok ? "连接成功" : "连接失败，请确认桌面端已运行且功能已启用";
});

void load();
