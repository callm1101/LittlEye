# 小眼睛（LittlEye）

一款面向研究生的轻量桌面学习伴侣：起身喝水提醒、置顶临时便利贴和可选的哔哩哔哩观看时长提醒。

## 当前状态

当前已具备：可恢复的提醒倒计时与暂停状态、完成/跳过/稍后记录、应用内弹窗和系统通知、可拖动/置顶的会话级便利贴、关闭隐藏到托盘、托盘快捷操作，以及可选的哔哩哔哩前台观看累计提醒。前端开发模式使用 `localStorage` 作为持久数据的临时适配层；后续会迁移到版本化 SQLite。便利贴正文始终只保存在当前进程内存中。

## 开发

需要 Node.js 20+、Rust stable，以及各平台的 Tauri 系统依赖。

```sh
npm install
npm run tauri dev
```

常用检查：`npm run lint`、`npm run build`、`npm test`。

## 获取安装包

不一定要把项目上传到 GitHub 才能生成 Windows 安装包，但 Tauri 的安装包通常需要在目标系统上构建：Windows 安装程序在 Windows 环境构建，Linux 安装包在 Linux 环境构建。若手边没有 Windows 电脑，使用本仓库已经配置好的 GitHub Actions 是最方便的方式。

上传仓库后，CI 会生成以下 64 位安装包：

- Windows：NSIS 安装程序（`.exe`）
- Linux：RPM（`.rpm`）、Debian 包（`.deb`）和 AppImage（`.AppImage`）
- macOS：应用程序包（`.app`，会以压缩包形式下载）

### 上传到 GitHub

先在 GitHub 新建一个空仓库，不要勾选自动创建 README、`.gitignore` 或 License。然后在本项目目录执行：

```sh
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

如果本地已经是 Git 仓库，只需要确认远程仓库地址并推送 `main` 分支，不要再次执行 `git init` 或重复添加 `origin`。

### 使用 GitHub Actions 构建

1. 打开 GitHub 仓库的 **Actions** 页面。
2. 首次使用时，按页面提示启用 Actions。
3. 在左侧选择 **Cross-platform build**。
4. 点击 **Run workflow**，选择 `main` 分支后再次点击 **Run workflow**。
5. 等待 Windows、Linux 和 macOS 三个任务完成。
6. 打开本次运行页面，在底部 **Artifacts** 区域下载：
   - `littleye-Windows`：包含 Windows `.exe` 安装程序；
   - `littleye-Linux`：包含 `.rpm`、`.deb` 和 `.AppImage`；
   - `littleye-macOS`：包含 macOS `.app`。

推送到 `main` 分支时也会自动构建。Pull Request 会执行相同构建，用来提前发现跨平台打包问题。GitHub 下载的 Artifact 本身是 ZIP 压缩包，解压后才是实际安装文件。

> 当前构建产物没有代码签名。Windows 可能显示 SmartScreen 提示，部分 Linux 发行版也可能提示软件来源未知。正式公开发布前，建议分别配置 Windows 代码签名和 macOS 签名/公证。

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

扩展安装和配对步骤见 [browser-extension/README.md](browser-extension/README.md)。桌面端必须保持运行，并在设置中主动启用“哔哩哔哩观看提醒”。扩展使用配对令牌连接本机 `127.0.0.1:47831`，不会上传浏览状态。

## 隐私

用户数据默认仅保存在本机。浏览器扩展只匹配 `bilibili.com`，且目前仅产生页面是否可见/活跃和时间戳；不会读取页面内容或浏览记录。

## 已知限制

SQLite 迁移、窗口位置/尺寸持久化和首次引导仍在后续里程碑。浏览器监测目前面向 Chromium Manifest V3 扩展；应用完全退出后不保证任何提醒。
