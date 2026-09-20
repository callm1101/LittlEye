# 小眼睛（LittlEye）

一款面向研究生的轻量桌面学习伴侣：起身喝水提醒、置顶临时便利贴和可配置白名单的网站浏览时长提醒。

## 当前状态

当前已具备：可恢复的提醒倒计时与暂停状态、喝水语音提示、应用内弹窗和系统通知、可拖动/置顶且透明度可调的会话级便利贴、关闭隐藏到托盘、托盘快捷操作，以及可选的网站白名单浏览计时。每个域名单独累计，任一网站达到阈值都会提醒。前端开发模式使用 `localStorage` 作为持久数据的临时适配层；后续会迁移到版本化 SQLite。便利贴正文始终只保存在当前进程内存中。

## 开发

需要 Node.js 20+、Rust stable，以及各平台的 Tauri 系统依赖。

```sh
npm install
npm run tauri dev
```

常用检查：`npm run lint`、`npm run build`、`npm test`。

## 获取安装包

不一定要把项目上传到 GitHub 才能生成 Windows 安装包，但 Tauri 的安装包通常需要在目标系统上构建：Windows 安装程序在 Windows 环境构建，Linux 安装包在 Linux 环境构建。若手边没有 Windows 电脑，使用本仓库已经配置好的 GitHub Actions 是最方便的方式。

在 GitHub 发布 Release 后，CI 会生成以下 64 位安装包：

- Windows：NSIS 安装程序（`.exe`）
- Linux：RPM（`.rpm`）、Debian 包（`.deb`）和 AppImage（`.AppImage`）
- macOS：应用程序包（`.app`，会以压缩包形式下载）

### 本机构建

在 macOS 上可构建本机调试版：

```sh
npm run tauri build -- --debug --bundles app
```

Windows 上可生成 NSIS 安装程序：

```sh
npm run tauri build -- --bundles nsis
```

Linux 上可一次生成 RPM、Deb 和 AppImage：

```sh
npm run tauri build -- --bundles rpm,deb,appimage
```

本机构建前需安装 Node.js 20+、Rust stable 和对应平台的 [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/)。RPM 构建还需要系统提供 `rpmbuild`；Fedora/RHEL 系通常可安装 `rpm-build`，Ubuntu/Debian 系通常可安装 `rpm`。

## 浏览器扩展

扩展安装、配对和网站授权步骤见 [browser-extension/README.md](browser-extension/README.md)。桌面端必须保持运行，并在设置中主动启用“网站浏览提醒”。默认白名单包含 `bilibili.com` 和 `xiaohongshu.com`；新增域名后，需要在扩展选项中同步并确认对应网站权限。扩展使用配对令牌连接本机 `127.0.0.1:47831`，不会上传浏览状态。

## 隐私

用户数据默认仅保存在本机。浏览器扩展只在用户明确授权的白名单域名中运行，仅发送匹配域名、页面是否可见/活跃和时间戳；不会读取或发送完整 URL、标题、页面内容、账户信息或浏览历史。

## 已知限制

SQLite 迁移、窗口位置持久化和首次引导仍在后续里程碑。浏览器监测目前面向 Chromium 102 及以上版本的 Manifest V3 扩展；应用完全退出后不保证任何提醒。
