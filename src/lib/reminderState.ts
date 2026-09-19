import type { ReminderAction } from "../repositories/reminderRepository";

export const SNOOZE_MINUTES = 10;

/** Computes exactly one following deadline for a completed reminder action. */
export function nextReminderDueAt(
  action: ReminderAction,
  now: number,
  intervalMinutes: number,
  snoozeMinutes = SNOOZE_MINUTES
): number {
  const delayMinutes = action === "snoozed" ? snoozeMinutes : intervalMinutes;
  return now + delayMinutes * 60_000;
}

export function initialReminderDueAt(now: number, intervalMinutes: number): number {
  return now + intervalMinutes * 60_000;
}
