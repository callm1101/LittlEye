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

export async function startWindowDragging() {
  if (isTauri()) await invoke("start_window_dragging");
}

export async function setBrowserMonitorToken(token: string | null) {
  if (isTauri()) await invoke("set_browser_monitor_token", { token });
}
