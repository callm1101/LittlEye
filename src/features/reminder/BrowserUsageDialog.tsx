type Props = { domain: string; minutes: number; onReset(): void; onSnooze(): void; onMuteToday(): void };

export function BrowserUsageDialog({ domain, minutes, onReset, onSnooze, onMuteToday }: Props) {
  return <div className="overlay" role="presentation"><section className="reminder browser-reminder" role="dialog" aria-modal="true" aria-labelledby="browser-reminder-title">
    <div className="mascot large angry" aria-hidden="true">ಠ_ಠ</div>
    <h1 id="browser-reminder-title">先从网页里回来一下</h1>
    <p>{domain} 已经浏览了约 {minutes} 分钟。休息一下，或者继续手头的学习吧。</p>
    <div className="actions"><button className="primary" autoFocus onClick={onReset}>我回来了</button><button onClick={onSnooze}>再看 10 分钟</button><button onClick={onMuteToday}>今天不再提醒</button></div>
  </section></div>;
}
