import { useCallback, useEffect, useRef, useState } from "react";
import { addDomainUsage, calculateActiveIncrement, emptyBrowserUsageState, findBrowserAlertDomain, localDayKey, nextLocalMidnight, type BrowserUsageState } from "../lib/browserUsageState";
import { pollBrowserMonitor } from "../lib/native";
import { browserUsageRepository } from "../repositories/browserUsageRepository";

export function useBrowserUsageMonitor(enabled: boolean, thresholdMinutes: number) {
  const [state, setState] = useState<BrowserUsageState>(() => emptyBrowserUsageState());
  const [ready, setReady] = useState(false);
  const [alertDomain, setAlertDomain] = useState<string>();
  const [connected, setConnected] = useState(false);
  const [activeDomain, setActiveDomain] = useState<string>();
  const [tick, setTick] = useState(Date.now());
  const activeDomainRef = useRef<string>();
  const lastEventAtRef = useRef<number>();

  useEffect(() => { void browserUsageRepository.load().then(value => { setState(value); setReady(true); }); }, []);
  useEffect(() => { if (ready) void browserUsageRepository.save(state); }, [ready, state]);
  useEffect(() => { const timer = window.setInterval(() => setTick(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!enabled) {
      activeDomainRef.current = undefined;
      setActiveDomain(undefined);
      setConnected(false);
      return;
    }
    let cancelled = false;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      try {
        const snapshot = await pollBrowserMonitor();
        if (cancelled) return;
        setConnected(snapshot.connected);
        if (!snapshot.connected) {
          activeDomainRef.current = undefined;
          setActiveDomain(undefined);
        }
        for (const { active, at, domain } of snapshot.events) {
          const previousDomain = activeDomainRef.current;
          const increment = previousDomain ? calculateActiveIncrement(lastEventAtRef.current, at) : 0;
          if (previousDomain && increment > 0) setState(current => addDomainUsage(current, previousDomain, increment));
          activeDomainRef.current = active ? domain : undefined;
          lastEventAtRef.current = at;
          setActiveDomain(active ? domain : undefined);
        }
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        polling = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);
  useEffect(() => {
    if (state.dayLocal !== localDayKey(new Date(tick))) {
      setState(emptyBrowserUsageState(new Date(tick)));
      setAlertDomain(undefined);
    }
  }, [state.dayLocal, tick]);
  useEffect(() => {
    if (!ready || !enabled || alertDomain) return;
    setAlertDomain(findBrowserAlertDomain(state, thresholdMinutes, tick));
  }, [alertDomain, enabled, ready, state, thresholdMinutes, tick]);

  const reset = useCallback(() => {
    if (!alertDomain) return;
    setState(current => ({ ...current, domains: { ...current.domains, [alertDomain]: { accumulatedSeconds: 0 } } }));
    setAlertDomain(undefined);
  }, [alertDomain]);
  const snooze = useCallback(() => {
    if (!alertDomain) return;
    setState(current => ({ ...current, domains: { ...current.domains, [alertDomain]: { ...current.domains[alertDomain], snoozedUntil: Date.now() + 10 * 60_000 } } }));
    setAlertDomain(undefined);
  }, [alertDomain]);
  const muteToday = useCallback(() => {
    if (!alertDomain) return;
    setState(current => ({ ...current, domains: { ...current.domains, [alertDomain]: { ...current.domains[alertDomain], mutedUntil: nextLocalMidnight() } } }));
    setAlertDomain(undefined);
  }, [alertDomain]);
  const resumeToday = useCallback(() => {
    setState(current => ({
      ...current,
      domains: Object.fromEntries(Object.entries(current.domains).map(([domain, usage]) => [domain, { ...usage, mutedUntil: undefined, snoozedUntil: undefined }])),
    }));
  }, []);
  const clear = useCallback(async () => {
    await pollBrowserMonitor();
    await browserUsageRepository.clear();
    activeDomainRef.current = undefined;
    setActiveDomain(undefined);
    setState(emptyBrowserUsageState());
    setAlertDomain(undefined);
  }, []);

  return {
    usageByDomain: Object.fromEntries(Object.entries(state.domains).map(([domain, usage]) => [domain, usage.accumulatedSeconds])),
    hasMutedDomains: Object.values(state.domains).some(usage => Boolean(usage.mutedUntil && usage.mutedUntil > tick)),
    activeDomain,
    connected,
    alertDomain,
    isShowing: Boolean(alertDomain),
    reset,
    snooze,
    muteToday,
    resumeToday,
    clear,
  };
}
