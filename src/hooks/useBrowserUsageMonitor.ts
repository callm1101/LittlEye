import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateActiveIncrement, localDayKey, nextLocalMidnight, shouldShowBrowserAlert, type BrowserUsageState } from "../lib/browserUsageState";
import { browserUsageRepository } from "../repositories/browserUsageRepository";

type ActivityEvent = { active: boolean; at: number };

export function useBrowserUsageMonitor(enabled: boolean, thresholdMinutes: number) {
  const [state, setState] = useState<BrowserUsageState>({ dayLocal: localDayKey(), accumulatedSeconds: 0 });
  const [ready, setReady] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const activeRef = useRef(false);
  const lastEventAtRef = useRef<number>();
  const lastSeenAtRef = useRef<number>();

  useEffect(() => { void browserUsageRepository.load().then(value => { setState(value); setReady(true); }); }, []);
  useEffect(() => { if (ready) void browserUsageRepository.save(state); }, [ready, state]);
  useEffect(() => { const timer = window.setInterval(() => setTick(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!enabled) { activeRef.current = false; setActive(false); setConnected(false); return; }
    let unlisten: (() => void) | undefined;
    void listen<ActivityEvent>("browser-activity", event => {
      const at = event.payload.at;
      const increment = activeRef.current ? calculateActiveIncrement(lastEventAtRef.current, at) : 0;
      setState(current => ({ ...current, accumulatedSeconds: current.accumulatedSeconds + increment }));
      activeRef.current = event.payload.active;
      lastEventAtRef.current = at;
      lastSeenAtRef.current = Date.now();
      setActive(event.payload.active);
      setConnected(true);
    }).then(callback => { unlisten = callback; });
    return () => unlisten?.();
  }, [enabled]);
  useEffect(() => {
    if (state.dayLocal !== localDayKey(new Date(tick))) {
      setState({ dayLocal: localDayKey(new Date(tick)), accumulatedSeconds: 0 });
      setIsShowing(false);
    }
    if (lastSeenAtRef.current && tick - lastSeenAtRef.current > 35_000) {
      activeRef.current = false; setActive(false); setConnected(false);
    }
  }, [state.dayLocal, tick]);
  useEffect(() => {
    if (ready && enabled && !isShowing && shouldShowBrowserAlert(state, thresholdMinutes, tick)) setIsShowing(true);
  }, [enabled, isShowing, ready, state, thresholdMinutes, tick]);

  const reset = useCallback(() => { activeRef.current = false; setActive(false); setState({ dayLocal: localDayKey(), accumulatedSeconds: 0 }); setIsShowing(false); }, []);
  const snooze = useCallback(() => { setState(current => ({ ...current, snoozedUntil: Date.now() + 10 * 60_000 })); setIsShowing(false); }, []);
  const muteToday = useCallback(() => { setState(current => ({ ...current, mutedUntil: nextLocalMidnight() })); setIsShowing(false); }, []);
  const resumeToday = useCallback(() => { setState(current => ({ ...current, mutedUntil: undefined, snoozedUntil: undefined })); }, []);
  const clear = useCallback(async () => { await browserUsageRepository.clear(); reset(); }, [reset]);

  return { accumulatedSeconds: state.accumulatedSeconds, mutedUntil: state.mutedUntil, active, connected, isShowing, reset, snooze, muteToday, resumeToday, clear };
}
