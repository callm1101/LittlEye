import { useCallback, useEffect, useRef, useState } from "react";
import { initialReminderDueAt, nextReminderDueAt } from "../lib/reminderState";
import { reminderRepository, type ReminderAction } from "../repositories/reminderRepository";
import { settingsRepository } from "../repositories/settingsRepository";

export function useReminderScheduler(intervalMinutes: number, snoozeMinutes: number) {
  const [paused, setPaused] = useState(false); const [isShowing, setIsShowing] = useState(false); const [ready, setReady] = useState(false);
  const [dueAt, setDueAt] = useState(() => initialReminderDueAt(Date.now(), intervalMinutes)); const [now, setNow] = useState(Date.now());
  const dueRef = useRef(dueAt); const intervalRef = useRef(intervalMinutes);
  useEffect(() => { dueRef.current = dueAt; }, [dueAt]);
  useEffect(() => { void (async () => { const savedDueAt = await settingsRepository.getNumber("reminder.dueAt", initialReminderDueAt(Date.now(), intervalMinutes)); setDueAt(savedDueAt); setPaused(await settingsRepository.getBoolean("reminder.paused", false)); setReady(true); })(); }, []);
  useEffect(() => { if (!ready || intervalRef.current === intervalMinutes) return; intervalRef.current = intervalMinutes; const nextAt = initialReminderDueAt(Date.now(), intervalMinutes); setDueAt(nextAt); void settingsRepository.set("reminder.dueAt", nextAt); }, [intervalMinutes, ready]);
  useEffect(() => { if (ready) void settingsRepository.set("reminder.dueAt", dueAt); }, [dueAt, ready]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if (ready && !paused && now >= dueAt && !isShowing) setIsShowing(true); }, [now, dueAt, paused, isShowing, ready]);
  const act = useCallback(async (action: ReminderAction) => { const scheduledAt = dueRef.current; const nextAt = nextReminderDueAt(action, Date.now(), intervalMinutes, snoozeMinutes); await reminderRepository.record({ scheduledAt, action }); setIsShowing(false); setDueAt(nextAt); }, [intervalMinutes, snoozeMinutes]);
  const togglePause = useCallback(() => { setPaused(value => { const next = !value; void settingsRepository.set("reminder.paused", next); return next; }); }, []);
  const triggerNow = useCallback(() => setIsShowing(true), []);
  return { remainingMs: Math.max(0, dueAt - now), paused, isShowing, togglePause, act, triggerNow };
}
