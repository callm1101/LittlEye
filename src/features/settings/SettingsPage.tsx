const intervals = [30, 45, 60, 90, 120];
const snoozeOptions = [5, 10, 15, 20];
const browserThresholds = [30, 45, 60];

type Props = {
  intervalMinutes: number;
  snoozeMinutes: number;
  voiceReminderEnabled: boolean;
  alwaysOnTop: boolean;
  windowOpacity: number;
  browserMonitorEnabled: boolean;
  browserThresholdMinutes: number;
  browserToken: string;
  browserConnected: boolean;
  browserActive: boolean;
  browserAccumulatedSeconds: number;
  browserMutedToday: boolean;
  onIntervalChange(value: number): void;
  onSnoozeChange(value: number): void;
  onVoiceReminderChange(value: boolean): void;
  onAlwaysOnTopChange(value: boolean): void;
  onWindowOpacityChange(value: number): void;
  onBrowserEnabledChange(value: boolean): void;
  onBrowserThresholdChange(value: number): void;
  onResumeBrowserToday(): void;
  onClearBrowserUsage(): Promise<void>;
  onBack(): void;
};

export function SettingsPage({
  intervalMinutes,
  snoozeMinutes,
  voiceReminderEnabled,
  alwaysOnTop,
  windowOpacity,
  browserMonitorEnabled,
  browserThresholdMinutes,
  browserToken,
  browserConnected,
  browserActive,
  browserAccumulatedSeconds,
  browserMutedToday,
  onIntervalChange,
  onSnoozeChange,
  onVoiceReminderChange,
  onAlwaysOnTopChange,
  onWindowOpacityChange,
  onBrowserEnabledChange,
  onBrowserThresholdChange,
  onResumeBrowserToday,
  onClearBrowserUsage,
  onBack,
}: Props) {
  function changeBrowserEnabled(enabled: boolean) {
    if (enabled && !window.confirm("启用后，扩展只会在 bilibili.com 标签页处于前台、可见且聚焦时发送活跃状态和时间戳。不会读取视频、账号或页面内容，数据仅保存在本机。是否继续？")) return;
    onBrowserEnabledChange(enabled);
  }

  return <section className="page">
    <header><button onClick={onBack}>← 返回</button><h1>设置</h1></header>
    <label className="setting">
      <span><strong>活动提醒间隔</strong><small>从应用启动或完成提醒后开始计时</small></span>
      <select value={intervalMinutes} onChange={event => onIntervalChange(Number(event.target.value))}>
        {intervals.map(value => <option key={value} value={value}>{value} 分钟</option>)}
      </select>
    </label>
    <label className="setting">
      <span><strong>稍后提醒时长</strong><small>提醒弹窗中点击“稍后”后的等待时间</small></span>
      <select value={snoozeMinutes} onChange={event => onSnoozeChange(Number(event.target.value))}>
        {snoozeOptions.map(value => <option key={value} value={value}>{value} 分钟</option>)}
      </select>
    </label>
    <label className="setting">
      <span><strong>喝水语音提示</strong><small>提醒弹出时使用系统中文语音播报，不会联网</small></span>
      <input type="checkbox" checked={voiceReminderEnabled} onChange={event => onVoiceReminderChange(event.target.checked)} />
    </label>
    <label className="setting">
      <span><strong>始终置顶</strong><small>以普通置顶窗口显示，不嵌入桌面壁纸</small></span>
      <input type="checkbox" checked={alwaysOnTop} onChange={event => onAlwaysOnTopChange(event.target.checked)} />
    </label>
    <label className="setting">
      <span><strong>便利贴透明度</strong><small>降低后能看到便利贴后面的桌面内容</small></span>
      <span className="setting-control">
        <input type="range" min="65" max="100" step="1" value={windowOpacity} onChange={event => onWindowOpacityChange(Number(event.target.value))} aria-label="便利贴透明度" />
        <output>{windowOpacity}%</output>
      </span>
    </label>

    <section className="settings-group" aria-labelledby="browser-monitor-title">
      <h2 id="browser-monitor-title">哔哩哔哩观看提醒</h2>
      <label className="setting">
        <span><strong>启用浏览器监测</strong><small>需要安装项目附带的浏览器扩展并完成本地配对</small></span>
        <input type="checkbox" checked={browserMonitorEnabled} onChange={event => changeBrowserEnabled(event.target.checked)} />
      </label>
      <label className="setting">
        <span><strong>提醒阈值</strong><small>只累计前台、可见且聚焦的 bilibili.com 页面</small></span>
        <select value={browserThresholdMinutes} onChange={event => onBrowserThresholdChange(Number(event.target.value))}>
          {browserThresholds.map(value => <option key={value} value={value}>{value} 分钟</option>)}
        </select>
      </label>
      <div className="monitor-card">
        <div><strong>连接状态</strong><p>{!browserMonitorEnabled ? "功能已关闭" : browserActive ? "正在累计观看时间" : browserConnected ? "扩展已连接，当前未观看" : "等待扩展连接"}</p></div>
        <span className={`status-dot ${browserConnected ? "connected" : ""}`} aria-hidden="true" />
      </div>
      <div className="monitor-card">
        <div><strong>今日累计</strong><p>{Math.floor(browserAccumulatedSeconds / 60)} 分 {Math.floor(browserAccumulatedSeconds % 60)} 秒</p></div>
        <button onClick={() => { if (window.confirm("确定清除今天的本地观看计时吗？")) void onClearBrowserUsage(); }}>清除计时</button>
      </div>
      {browserMutedToday && <div className="monitor-card">
        <div><strong>今日提醒已静默</strong><p>计时仍会保留，但今天不会再次弹窗。</p></div>
        <button onClick={onResumeBrowserToday}>恢复提醒</button>
      </div>}
      <div className="pairing">
        <strong>扩展配对令牌</strong>
        <small>在扩展的“选项”页面粘贴此令牌。请勿分享给其他人。</small>
        <div><code>{browserToken || "正在生成…"}</code><button onClick={() => void navigator.clipboard.writeText(browserToken)} disabled={!browserToken}>复制</button></div>
      </div>
    </section>
    <p className="privacy">便利贴内容只存在于本次运行中，彻底退出应用后会清空。提醒与外观设置会保存在这台设备上。</p>
  </section>;
}
