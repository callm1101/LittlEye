import { invoke } from "@tauri-apps/api/core";

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export async function setAlwaysOnTop(enabled: boolean) {
  if (isTauri()) await invoke("set_always_on_top", { enabled });
}

export async function notifyReminder() {
  if (isTauri()) await invoke("show_system_notification");
}

export function speakHydrationReminder() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const message = new SpeechSynthesisUtterance("该起来活动一下，喝点水啦。");
  message.lang = "zh-CN";
  message.rate = 0.95;
  message.volume = 0.9;
  window.speechSynthesis.speak(message);
}

export async function startWindowDragging() {
  if (isTauri()) await invoke("start_window_dragging");
}

export async function setBrowserMonitorToken(token: string | null) {
  if (isTauri()) await invoke("set_browser_monitor_token", { token });
}
