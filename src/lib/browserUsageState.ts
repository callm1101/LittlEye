export type BrowserUsageState = {
  dayLocal: string;
  accumulatedSeconds: number;
  snoozedUntil?: number;
  mutedUntil?: number;
};

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

export function shouldShowBrowserAlert(state: BrowserUsageState, thresholdMinutes: number, now: number) {
  return state.accumulatedSeconds >= thresholdMinutes * 60
    && (!state.snoozedUntil || now >= state.snoozedUntil)
    && (!state.mutedUntil || now >= state.mutedUntil);
}
