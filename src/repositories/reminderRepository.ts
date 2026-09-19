import { localStore } from "./localStore";
export type ReminderAction = "completed" | "snoozed" | "skipped";
export type ReminderEvent = { id: string; scheduledAt: number; action: ReminderAction; actedAt: number };
export const reminderRepository = { async record(input: Pick<ReminderEvent, "scheduledAt" | "action">) { const events = localStore.get<ReminderEvent[]>("reminder-events") ?? []; localStore.set("reminder-events", [{ id: crypto.randomUUID(), ...input, actedAt: Date.now() }, ...events]); } };
