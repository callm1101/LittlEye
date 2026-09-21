import { startWindowDragging } from "../lib/native";

type Props = { remainingMs: number; paused: boolean; stickyText: string; alwaysOnTop: boolean; onStickyTextChange(value: string): void; onClear(): void; onOpenSettings(): void; onTogglePause(): void; onTogglePin(): void };
export function WidgetWindow({ remainingMs, paused, stickyText, alwaysOnTop, onStickyTextChange, onClear, onOpenSettings, onTogglePause, onTogglePin }: Props) {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  return <section className="widget sticky-note" aria-label="小眼睛桌面便利贴">
    <div className="widget-head"><div className="drag-handle" data-tauri-drag-region onMouseDown={event => { if (event.button === 0) void startWindowDragging(); }} title="按住这里移动便利贴"><span className="mascot" aria-hidden="true">◕‿◕</span><span className="app-name">{paused ? "提醒已暂停" : `${totalMinutes} 分钟后提醒`}</span></div><div className="window-actions"><button className={`icon-button ${alwaysOnTop ? "active" : ""}`} onClick={onTogglePin} aria-label={alwaysOnTop ? "取消置顶" : "置顶便利贴"} aria-pressed={alwaysOnTop} title={alwaysOnTop ? "取消置顶" : "置顶便利贴"}>⌖</button><button className="icon-button" onClick={onOpenSettings} aria-label="打开设置" title="设置">⚙</button></div></div>
    <textarea className="sticky-editor" value={stickyText} onChange={event => onStickyTextChange(event.target.value)} placeholder="在这里写点什么…" aria-label="临时便利贴内容" spellCheck />
    <div className="sticky-footer"><span>{stickyText.length} 字</span><div className="actions"><button className="text-button" onClick={onTogglePause}>{paused ? "恢复提醒" : "暂停提醒"}</button><button className="text-button" onClick={onClear} disabled={!stickyText}>清空</button></div></div>
    <p className="sticky-session-hint">彻底退出小眼睛后，这里的内容会自动清空。</p>
  </section>;
}
