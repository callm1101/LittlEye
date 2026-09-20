import { describe, expect, it } from "vitest";
import { addDomainUsage, calculateActiveIncrement, emptyBrowserUsageState, findBrowserAlertDomain } from "./browserUsageState";

describe("browser usage state", () => {
  it("accumulates the trusted interval between heartbeats", () => { expect(calculateActiveIncrement(1_000, 11_000)).toBe(10); });
  it("does not count gaps caused by sleep or a stopped extension", () => { expect(calculateActiveIncrement(1_000, 91_000)).toBe(0); });

  it("tracks each allowed domain independently", () => {
    const initial = emptyBrowserUsageState(new Date(2026, 8, 17));
    const withFirst = addDomainUsage(initial, "example.com", 900);
    const withBoth = addDomainUsage(withFirst, "docs.example.org", 600);
    expect(withBoth.domains["example.com"].accumulatedSeconds).toBe(900);
    expect(withBoth.domains["docs.example.org"].accumulatedSeconds).toBe(600);
  });

  it("alerts when any one domain reaches the threshold", () => {
    const state = {
      dayLocal: "2026-09-17",
      domains: {
        "example.com": { accumulatedSeconds: 1799 },
        "openai.com": { accumulatedSeconds: 1800 },
      },
    };
    expect(findBrowserAlertDomain(state, 30, 10_000)).toBe("openai.com");
  });

  it("honors per-domain snooze and daily mute", () => {
    const state = {
      dayLocal: "2026-09-17",
      domains: {
        "example.com": { accumulatedSeconds: 1800, snoozedUntil: 20_000 },
        "openai.com": { accumulatedSeconds: 1800, mutedUntil: 20_000 },
      },
    };
    expect(findBrowserAlertDomain(state, 30, 10_000)).toBeUndefined();
  });
});
