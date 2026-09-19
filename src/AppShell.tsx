import { useEffect, useState } from "react";
import { WidgetWindow } from "./components/WidgetWindow";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ReminderDialog } from "./features/reminder/ReminderDialog";
import { BrowserUsageDialog } from "./features/reminder/BrowserUsageDialog";
import { useReminderScheduler } from "./hooks/useReminderScheduler";
import { useBrowserUsageMonitor } from "./hooks/useBrowserUsageMonitor";
import { settingsRepository } from "./repositories/settingsRepository";
import { listen } from "@tauri-apps/api/event";
import { notifyReminder, setAlwaysOnTop, setBrowserMonitorToken } from "./lib/native";

type View = "widget" | "settings";

export function AppShell() {
  const [view, setView] = useState<View>("widget");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(true);
  const [browserMonitorEnabled, setBrowserMonitorEnabled] = useState(false);
  const [browserThresholdMinutes, setBrowserThresholdMinutes] = useState(30);
  const [browserToken, setBrowserToken] = useState("");
  const [stickyText, setStickyText] = useState("");
  const scheduler = useReminderScheduler(intervalMinutes, snoozeMinutes);
  const browserMonitor = useBrowserUsageMonitor(browserMonitorEnabled, browserThresholdMinutes);

  useEffect(() => { void settingsRepository.getNumber("reminder.intervalMinutes", 60).then(setIntervalMinutes); void settingsRepository.getNumber("reminder.snoozeMinutes", 10).then(setSnoozeMinutes); void settingsRepository.getBoolean("window.alwaysOnTop", true).then(enabled => { setAlwaysOnTopState(enabled); void setAlwaysOnTop(enabled); }); }, []);
  useEffect(() => { void (async () => { setBrowserMonitorEnabled(await settingsRepository.getBoolean("browser.enabled", false)); setBrowserThresholdMinutes(await settingsRepository.getNumber("browser.thresholdMinutes", 30)); let token = await settingsRepository.getString("browser.token", ""); if (!token) { token = crypto.randomUUID().replace(/-/g, ""); await settingsRepository.set("browser.token", token); } setBrowserToken(token); })(); }, []);
  useEffect(() => { void setBrowserMonitorToken(browserMonitorEnabled && browserToken ? browserToken : null); }, [browserMonitorEnabled, browserToken]);
  useEffect(() => { if (scheduler.isShowing) void notifyReminder(); }, [scheduler.isShowing]);
  useEffect(() => { let unlisten: (() => void) | undefined; void listen("trigger-reminder", () => scheduler.triggerNow()).then(callback => { unlisten = callback; }); return () => unlisten?.(); }, [scheduler.triggerNow]);
  useEffect(() => { let unlisten: (() => void) | undefined; void listen("open-settings", () => setView("settings")).then(callback => { unlisten = callback; }); return () => unlisten?.(); }, []);
  async function updateInterval(minutes: number) {
    setIntervalMinutes(minutes);
    await settingsRepository.set("reminder.intervalMinutes", minutes);
  }
  async function updateSnooze(minutes: number) { setSnoozeMinutes(minutes); await settingsRepository.set("reminder.snoozeMinutes", minutes); }
  async function updateAlwaysOnTop(enabled: boolean) { setAlwaysOnTopState(enabled); await settingsRepository.set("window.alwaysOnTop", enabled); await setAlwaysOnTop(enabled); }
  async function updateBrowserEnabled(enabled: boolean) { setBrowserMonitorEnabled(enabled); await settingsRepository.set("browser.enabled", enabled); }
  async function updateBrowserThreshold(minutes: number) { setBrowserThresholdMinutes(minutes); await settingsRepository.set("browser.thresholdMinutes", minutes); }

  return <main className="app-shell">
    {view === "widget" && <WidgetWindow remainingMs={scheduler.remainingMs} paused={scheduler.paused} stickyText={stickyText} alwaysOnTop={alwaysOnTop}
      onStickyTextChange={setStickyText} onClear={() => setStickyText("")} onOpenSettings={() => setView("settings")}
      onTogglePause={scheduler.togglePause} onTogglePin={() => void updateAlwaysOnTop(!alwaysOnTop)} />}
    {view === "settings" && <SettingsPage intervalMinutes={intervalMinutes} snoozeMinutes={snoozeMinutes} alwaysOnTop={alwaysOnTop} browserMonitorEnabled={browserMonitorEnabled} browserThresholdMinutes={browserThresholdMinutes} browserToken={browserToken} browserConnected={browserMonitor.connected} browserActive={browserMonitor.active} browserAccumulatedSeconds={browserMonitor.accumulatedSeconds} browserMutedToday={Boolean(browserMonitor.mutedUntil && browserMonitor.mutedUntil > Date.now())} onIntervalChange={updateInterval} onSnoozeChange={updateSnooze} onAlwaysOnTopChange={updateAlwaysOnTop} onBrowserEnabledChange={updateBrowserEnabled} onBrowserThresholdChange={updateBrowserThreshold} onResumeBrowserToday={browserMonitor.resumeToday} onClearBrowserUsage={browserMonitor.clear} onBack={() => setView("widget")} />}
    {scheduler.isShowing && <ReminderDialog snoozeMinutes={snoozeMinutes} onComplete={() => scheduler.act("completed")} onSnooze={() => scheduler.act("snoozed")} onSkip={() => scheduler.act("skipped")} />}
    {browserMonitor.isShowing && !scheduler.isShowing && <BrowserUsageDialog minutes={Math.max(browserThresholdMinutes, Math.floor(browserMonitor.accumulatedSeconds / 60))} onReset={browserMonitor.reset} onSnooze={browserMonitor.snooze} onMuteToday={browserMonitor.muteToday} />}
  </main>;
}
