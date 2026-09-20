import { useState } from "react";
import { normalizeDomain } from "../../lib/domainWhitelist";

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
  browserAllowedDomains: string[];
  browserToken: string;
  browserConnected: boolean;
  browserActiveDomain?: string;
  browserUsageByDomain: Record<string, number>;
  browserMutedToday: boolean;
  onIntervalChange(value: number): void;
  onSnoozeChange(value: number): void;
  onVoiceReminderChange(value: boolean): void;
  onAlwaysOnTopChange(value: boolean): void;
  onWindowOpacityChange(value: number): void;
  onBrowserEnabledChange(value: boolean): void;
  onBrowserThresholdChange(value: number): void;
  onBrowserAllowedDomainsChange(value: string[]): void;
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
  browserAllowedDomains,
  browserToken,
  browserConnected,
  browserActiveDomain,
  browserUsageByDomain,
  browserMutedToday,
  onIntervalChange,
  onSnoozeChange,
  onVoiceReminderChange,
  onAlwaysOnTopChange,
  onWindowOpacityChange,
  onBrowserEnabledChange,
  onBrowserThresholdChange,
  onBrowserAllowedDomainsChange,
  onResumeBrowserToday,
  onClearBrowserUsage,
  onBack,
}: Props) {
  const [domainDraft, setDomainDraft] = useState("");
  const [domainError, setDomainError] = useState("");

  function changeBrowserEnabled(enabled: boolean) {
    if (enabled && !window.confirm("启用后，扩展只会在你明确授权的白名单网站处于前台、可见且聚焦时发送域名、活跃状态和时间戳。不会读取完整网址、账号或页面内容，数据仅保存在本机。是否继续？")) return;
    onBrowserEnabledChange(enabled);
  }

  function addDomain() {
    const domain = normalizeDomain(domainDraft);
    if (!domain) { setDomainError("请输入有效域名，例如 example.com"); return; }
    if (browserAllowedDomains.includes(domain)) { setDomainError("该域名已在白名单中"); return; }
    if (browserAllowedDomains.length >= 32) { setDomainError("最多添加 32 个域名"); return; }
    onBrowserAllowedDomainsChange([...browserAllowedDomains, domain]);
    setDomainDraft("");
    setDomainError("");
  }

  function removeDomain(domain: string) {
    if (browserAllowedDomains.length === 1) { setDomainError("白名单至少需要保留一个域名"); return; }
    onBrowserAllowedDomainsChange(browserAllowedDomains.filter(value => value !== domain));
    setDomainError("");
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
        <input type="range" min="10" max="100" step="1" value={windowOpacity} onChange={event => onWindowOpacityChange(Number(event.target.value))} aria-label="便利贴透明度" />
        <output>{windowOpacity}%</output>
      </span>
    </label>

    <section className="settings-group" aria-labelledby="browser-monitor-title">
      <h2 id="browser-monitor-title">网站浏览提醒</h2>
      <label className="setting">
        <span><strong>启用浏览器监测</strong><small>需要安装项目附带的浏览器扩展并完成本地配对</small></span>
        <input type="checkbox" checked={browserMonitorEnabled} onChange={event => changeBrowserEnabled(event.target.checked)} />
      </label>
      <label className="setting">
        <span><strong>单个网站提醒阈值</strong><small>每个白名单域名单独累计前台、可见且聚焦的浏览时间</small></span>
        <select value={browserThresholdMinutes} onChange={event => onBrowserThresholdChange(Number(event.target.value))}>
          {browserThresholds.map(value => <option key={value} value={value}>{value} 分钟</option>)}
        </select>
      </label>
      <div className="whitelist-editor">
        <strong>网站白名单</strong>
        <small>输入域名或网页地址；子域名会包含在对应根域名规则内</small>
        <div className="domain-list" aria-label="网站白名单">
          {browserAllowedDomains.map(domain => <span className="domain-chip" key={domain}>{domain}<button type="button" onClick={() => removeDomain(domain)} aria-label={`从白名单移除 ${domain}`}>×</button></span>)}
        </div>
        <div className="domain-entry">
          <input value={domainDraft} onChange={event => setDomainDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addDomain(); } }} placeholder="例如 youtube.com" aria-label="添加白名单域名" aria-describedby="domain-help" />
          <button type="button" onClick={addDomain}>添加</button>
        </div>
        <small id="domain-help" className={domainError ? "field-error" : ""}>{domainError || "修改后请到扩展选项点击“同步白名单并授权”，新打开或刷新页面后开始计时。"}</small>
      </div>
      <div className="monitor-card">
        <div><strong>连接状态</strong><p>{!browserMonitorEnabled ? "功能已关闭" : browserActiveDomain ? `正在累计 ${browserActiveDomain}` : browserConnected ? "扩展已连接，当前未浏览白名单网站" : "等待扩展连接"}</p></div>
        <span className={`status-dot ${browserConnected ? "connected" : ""}`} aria-hidden="true" />
      </div>
      <div className="monitor-card">
        <div><strong>今日累计</strong>{Object.keys(browserUsageByDomain).length
          ? <ul className="usage-list">{Object.entries(browserUsageByDomain).map(([domain, seconds]) => <li key={domain}><span>{domain}</span><span>{Math.floor(seconds / 60)} 分 {Math.floor(seconds % 60)} 秒</span></li>)}</ul>
          : <p>还没有白名单网站的浏览记录</p>}</div>
        <button onClick={() => { if (window.confirm("确定清除今天所有白名单网站的本地浏览计时吗？")) void onClearBrowserUsage(); }}>清除计时</button>
      </div>
      {browserMutedToday && <div className="monitor-card">
        <div><strong>部分网站今日已静默</strong><p>这些网站仍保留计时，其他白名单网站会照常提醒。</p></div>
        <button onClick={onResumeBrowserToday}>恢复提醒</button>
      </div>}
      <div className="pairing">
        <strong>扩展配对令牌</strong>
        <small>在扩展的“选项”页面粘贴此令牌，再同步白名单并确认网站权限。请勿分享令牌。</small>
        <div><code>{browserToken || "正在生成…"}</code><button onClick={() => void navigator.clipboard.writeText(browserToken)} disabled={!browserToken}>复制</button></div>
      </div>
    </section>
    <p className="privacy">便利贴内容只存在于本次运行中，彻底退出应用后会清空。提醒与外观设置会保存在这台设备上。</p>
  </section>;
}
