import { describe, expect, it } from "vitest";
import { calculateActiveIncrement, shouldShowBrowserAlert } from "./browserUsageState";

describe("browser usage state", () => {
  it("accumulates the trusted interval between heartbeats", () => { expect(calculateActiveIncrement(1_000, 11_000)).toBe(10); });
  it("does not count gaps caused by sleep or a stopped extension", () => { expect(calculateActiveIncrement(1_000, 91_000)).toBe(0); });
  it("does not alert before the threshold", () => { expect(shouldShowBrowserAlert({ dayLocal: "2026-09-17", accumulatedSeconds: 1799 }, 30, 10_000)).toBe(false); });
  it("honors snooze and daily mute", () => {
    expect(shouldShowBrowserAlert({ dayLocal: "2026-09-17", accumulatedSeconds: 1800, snoozedUntil: 20_000 }, 30, 10_000)).toBe(false);
    expect(shouldShowBrowserAlert({ dayLocal: "2026-09-17", accumulatedSeconds: 1800, mutedUntil: 20_000 }, 30, 10_000)).toBe(false);
  });
});
