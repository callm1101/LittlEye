import { describe, expect, it } from "vitest";
import { initialReminderDueAt, nextReminderDueAt } from "./reminderState";

describe("reminder scheduling", () => {
  const now = 1_700_000_000_000;

  it("schedules the first reminder from the chosen interval", () => {
    expect(initialReminderDueAt(now, 60)).toBe(now + 60 * 60_000);
  });

  it.each(["completed", "skipped"] as const)("starts a normal interval after %s", action => {
    expect(nextReminderDueAt(action, now, 45)).toBe(now + 45 * 60_000);
  });

  it("delays only the current reminder by ten minutes when snoozed", () => {
    expect(nextReminderDueAt("snoozed", now, 60)).toBe(now + 10 * 60_000);
  });

  it("uses the configured snooze duration", () => {
    expect(nextReminderDueAt("snoozed", now, 60, 15)).toBe(now + 15 * 60_000);
  });
});
