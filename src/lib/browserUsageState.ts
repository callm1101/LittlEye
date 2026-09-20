export type DomainUsageState = {
  accumulatedSeconds: number;
  snoozedUntil?: number;
  mutedUntil?: number;
};

export type BrowserUsageState = {
  dayLocal: string;
  domains: Record<string, DomainUsageState>;
};

export function emptyBrowserUsageState(date = new Date()): BrowserUsageState {
  return { dayLocal: localDayKey(date), domains: {} };
}

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextLocalMidnight(now = Date.now()) {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

export function calculateActiveIncrement(previousAt: number | undefined, currentAt: number) {
  if (previousAt === undefined) return 0;
  const seconds = (currentAt - previousAt) / 1000;
  return seconds >= 0 && seconds <= 30 ? seconds : 0;
}

export function addDomainUsage(state: BrowserUsageState, domain: string, seconds: number): BrowserUsageState {
  if (seconds <= 0) return state;
  const current = state.domains[domain] ?? { accumulatedSeconds: 0 };
  return {
    ...state,
    domains: {
      ...state.domains,
      [domain]: { ...current, accumulatedSeconds: current.accumulatedSeconds + seconds },
    },
  };
}

export function findBrowserAlertDomain(state: BrowserUsageState, thresholdMinutes: number, now: number) {
  return Object.entries(state.domains).find(([, usage]) => usage.accumulatedSeconds >= thresholdMinutes * 60
    && (!usage.snoozedUntil || now >= usage.snoozedUntil)
    && (!usage.mutedUntil || now >= usage.mutedUntil))?.[0];
}
