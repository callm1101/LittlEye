type Props = { snoozeMinutes: number; onComplete(): void; onSnooze(): void; onSkip(): void };
export function ReminderDialog({ snoozeMinutes, onComplete, onSnooze, onSkip }: Props) {
  return <div className="overlay" role="presentation"><section className="reminder" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
    <div className="mascot large" aria-hidden="true">ᵔᴗᵔ</div><h1 id="reminder-title">活动一下，喝点水</h1><p>该起来活动并喝口水啦。</p>
    <div className="actions"><button className="primary" autoFocus onClick={onComplete}>完成</button><button onClick={onSnooze}>稍后 {snoozeMinutes} 分钟</button><button onClick={onSkip}>跳过</button></div>
  </section></div>;
}
