import { useEffect, useRef, useState } from "react";
import { WidgetWindow } from "./components/WidgetWindow";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ReminderDialog } from "./features/reminder/ReminderDialog";
import { BrowserUsageDialog } from "./features/reminder/BrowserUsageDialog";
import { useReminderScheduler } from "./hooks/useReminderScheduler";
import { useBrowserUsageMonitor } from "./hooks/useBrowserUsageMonitor";
import { settingsRepository } from "./repositories/settingsRepository";
import { listen } from "@tauri-apps/api/event";
import { notifyReminder, setAlwaysOnTop, setBrowserMonitorConfig, speakHydrationReminder } from "./lib/native";
import { defaultBrowserDomains, normalizeDomainList, parseStoredDomains } from "./lib/domainWhitelist";

type View = "widget" | "settings";

export function AppShell() {
  const [view, setView] = useState<View>("widget");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(true);
  const [voiceReminderEnabled, setVoiceReminderEnabled] = useState(false);
  const [windowOpacity, setWindowOpacity] = useState(75);
  const [browserMonitorEnabled, setBrowserMonitorEnabled] = useState(false);
  const [browserThresholdMinutes, setBrowserThresholdMinutes] = useState(30);
  const [browserAllowedDomains, setBrowserAllowedDomains] = useState<string[]>(defaultBrowserDomains);
  const [browserToken, setBrowserToken] = useState("");
  const [stickyText, setStickyText] = useState("");
  const scheduler = useReminderScheduler(intervalMinutes, snoozeMinutes);
  const browserMonitor = useBrowserUsageMonitor(browserMonitorEnabled, browserThresholdMinutes);
  const voicePlayedForCurrentReminder = useRef(false);

  useEffect(() => {
    void settingsRepository.getNumber("reminder.intervalMinutes", 60).then(setIntervalMinutes);
    void settingsRepository.getNumber("reminder.snoozeMinutes", 10).then(setSnoozeMinutes);
    void settingsRepository.getBoolean("reminder.voiceEnabled", false).then(setVoiceReminderEnabled);
    void settingsRepository.getNumber("window.opacity", 75).then(setWindowOpacity);
    void settingsRepository.getBoolean("window.alwaysOnTop", true).then(enabled => { setAlwaysOnTopState(enabled); void setAlwaysOnTop(enabled); });
  }, []);
  useEffect(() => { void (async () => {
    setBrowserMonitorEnabled(await settingsRepository.getBoolean("browser.enabled", false));
    setBrowserThresholdMinutes(await settingsRepository.getNumber("browser.thresholdMinutes", 30));
    setBrowserAllowedDomains(parseStoredDomains(await settingsRepository.getString("browser.allowedDomains", JSON.stringify(defaultBrowserDomains))));
    let token = await settingsRepository.getString("browser.token", "");
    if (!token) { token = crypto.randomUUID().replace(/-/g, ""); await settingsRepository.set("browser.token", token); }
    setBrowserToken(token);
  })(); }, []);
  useEffect(() => { void setBrowserMonitorConfig(browserMonitorEnabled && browserToken ? browserToken : null, browserAllowedDomains); }, [browserAllowedDomains, browserMonitorEnabled, browserToken]);
  useEffect(() => { if (scheduler.isShowing) void notifyReminder(); }, [scheduler.isShowing]);
  useEffect(() => {
    if (!scheduler.isShowing) {
      voicePlayedForCurrentReminder.current = false;
      return;
    }
    if (voiceReminderEnabled && !voicePlayedForCurrentReminder.current) {
      voicePlayedForCurrentReminder.current = true;
      speakHydrationReminder();
    }
  }, [scheduler.isShowing, voiceReminderEnabled]);
  useEffect(() => {
    document.documentElement.style.setProperty("--window-opacity", String(windowOpacity / 100));
  }, [windowOpacity]);
  useEffect(() => { let unlisten: (() => void) | undefined; void listen("trigger-reminder", () => scheduler.triggerNow()).then(callback => { unlisten = callback; }); return () => unlisten?.(); }, [scheduler.triggerNow]);
  useEffect(() => { let unlisten: (() => void) | undefined; void listen("open-settings", () => setView("settings")).then(callback => { unlisten = callback; }); return () => unlisten?.(); }, []);
  async function updateInterval(minutes: number) {
    setIntervalMinutes(minutes);
    await settingsRepository.set("reminder.intervalMinutes", minutes);
  }
  async function updateSnooze(minutes: number) { setSnoozeMinutes(minutes); await settingsRepository.set("reminder.snoozeMinutes", minutes); }
  async function updateVoiceReminder(enabled: boolean) { setVoiceReminderEnabled(enabled); await settingsRepository.set("reminder.voiceEnabled", enabled); }
  async function updateAlwaysOnTop(enabled: boolean) { setAlwaysOnTopState(enabled); await settingsRepository.set("window.alwaysOnTop", enabled); await setAlwaysOnTop(enabled); }
  async function updateWindowOpacity(opacity: number) { setWindowOpacity(opacity); await settingsRepository.set("window.opacity", opacity); }
  async function updateBrowserEnabled(enabled: boolean) { setBrowserMonitorEnabled(enabled); await settingsRepository.set("browser.enabled", enabled); }
  async function updateBrowserThreshold(minutes: number) { setBrowserThresholdMinutes(minutes); await settingsRepository.set("browser.thresholdMinutes", minutes); }
  async function updateBrowserAllowedDomains(domains: string[]) {
    const normalized = normalizeDomainList(domains);
    if (!normalized.length) return;
    setBrowserAllowedDomains(normalized);
    await settingsRepository.set("browser.allowedDomains", JSON.stringify(normalized));
  }

  return <main className="app-shell">
    {view === "widget" && <WidgetWindow remainingMs={scheduler.remainingMs} paused={scheduler.paused} stickyText={stickyText} alwaysOnTop={alwaysOnTop}
      onStickyTextChange={setStickyText} onClear={() => setStickyText("")} onOpenSettings={() => setView("settings")}
      onTogglePause={scheduler.togglePause} onTogglePin={() => void updateAlwaysOnTop(!alwaysOnTop)} />}
    {view === "settings" && <SettingsPage intervalMinutes={intervalMinutes} snoozeMinutes={snoozeMinutes} voiceReminderEnabled={voiceReminderEnabled} alwaysOnTop={alwaysOnTop} windowOpacity={windowOpacity} browserMonitorEnabled={browserMonitorEnabled} browserThresholdMinutes={browserThresholdMinutes} browserAllowedDomains={browserAllowedDomains} browserToken={browserToken} browserConnected={browserMonitor.connected} browserActiveDomain={browserMonitor.activeDomain} browserUsageByDomain={browserMonitor.usageByDomain} browserMutedToday={browserMonitor.hasMutedDomains} onIntervalChange={updateInterval} onSnoozeChange={updateSnooze} onVoiceReminderChange={updateVoiceReminder} onAlwaysOnTopChange={updateAlwaysOnTop} onWindowOpacityChange={updateWindowOpacity} onBrowserEnabledChange={updateBrowserEnabled} onBrowserThresholdChange={updateBrowserThreshold} onBrowserAllowedDomainsChange={updateBrowserAllowedDomains} onResumeBrowserToday={browserMonitor.resumeToday} onClearBrowserUsage={browserMonitor.clear} onBack={() => setView("widget")} />}
    {scheduler.isShowing && <ReminderDialog snoozeMinutes={snoozeMinutes} onComplete={() => scheduler.act("completed")} onSnooze={() => scheduler.act("snoozed")} onSkip={() => scheduler.act("skipped")} />}
    {browserMonitor.isShowing && browserMonitor.alertDomain && !scheduler.isShowing && <BrowserUsageDialog domain={browserMonitor.alertDomain} minutes={Math.max(browserThresholdMinutes, Math.floor((browserMonitor.usageByDomain[browserMonitor.alertDomain] ?? 0) / 60))} onReset={browserMonitor.reset} onSnooze={browserMonitor.snooze} onMuteToday={browserMonitor.muteToday} />}
  </main>;
}
