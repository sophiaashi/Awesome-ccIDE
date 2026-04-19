# CLAUDE.md — ccIDE 项目专用指令

> 继承自用户全局 `~/.claude/CLAUDE.md` 的所有规则（语言、前端三更、安全红线、Skill 优先、解决问题方式等）。以下是本项目的附加规则。

## 项目概览

**ccIDE** — 管理 Claude Code 历史 session 的 macOS 原生桌面应用。

- 技术栈：Electron + React + TypeScript + xterm.js + node-pty
- 入口：`electron/main.ts` (主进程) / `src/App.tsx` (渲染进程)
- 数据源：`~/.claude/projects/*/sessions-index.json` + `~/.claude/history.jsonl`
- 自定义名称存储：`~/.claude-session-manager/session-names.json`

## 同步铁律（必须严格遵守）

**所有已确认的改动，必须保持三处同步：**

1. **本地代码** (`~/ccIDE/`)
2. **远端 git** (`git@github.com:sophiaashi/ccIDE.git`，仓库展示名 `Awesome-ccIDE`)
3. **GitHub Release 的 DMG 包**（`v1.0.0` 标签）

### 每次改动完成后的标准流程

```bash
# 1. 编译检查
cd ~/ccIDE && npx tsc --noEmit

# 2. 打包
npm run dist

# 3. 安装到本地 Applications
rm -rf /Applications/ccIDE.app && cp -R release/mac-arm64/ccIDE.app /Applications/

# 4. 提交并推送代码
git add -A && git commit -m "..." && git push origin main

# 5. 更新 GitHub Release DMG（关键步骤，容易遗漏）
gh release delete v1.0.0 --repo sophiaashi/Awesome-ccIDE --yes
gh release create v1.0.0 \
  --repo sophiaashi/Awesome-ccIDE \
  --title "ccIDE v1.0.0" \
  --notes "macOS Apple Silicon (arm64). Download DMG, drag to Applications, done." \
  release/ccIDE-1.0.0-arm64.dmg
```

### DMG 更新频率

- **任何用户可见的改动（UI、功能）** → 必须同步更新 DMG
- **内部重构、注释修改** → 代码推送即可，DMG 可延后
- **不确定时，默认更新 DMG**。用户下载的是 DMG，不是 git 代码

## 构建输出

| 文件 | 用途 |
|------|------|
| `dist/` | Vite 前端构建产物 |
| `dist-electron/electron/main.cjs` | 编译后的主进程 |
| `release/mac-arm64/ccIDE.app` | 打包的 macOS app |
| `release/ccIDE-1.0.0-arm64.dmg` | 分发用的 DMG（~123MB，含 Electron 运行时） |

## 架构关键点

- **Electron main process** 负责：session 数据读取、node-pty 管理、IPC handler
- **React renderer** 负责：UI 渲染、通过 `window.electronAPI` 调 IPC
- **preload.ts** 安全暴露 IPC（contextBridge）
- **开发模式**：`npm run dev` 启动 Vite + Electron 双进程
- **生产模式**：`main.cjs` 用 `loadFile('../../dist/index.html')` 加载（路径是 `dist-electron/electron/` → 上两级 → `dist/`）

## 常见陷阱

1. **黑屏问题** → 检查 `mainWindow.loadFile` 的相对路径
2. **Resume 报错 `env: node: No such file`** → pty spawn 必须加 `--login` 参数 + 显式传完整 PATH
3. **icon 外层有灰色底板** → icon 图片必须完全不透明，渐变填满 1024x1024
4. **当前 session 不在列表** → `sessions-index.json` 可能未及时更新，需扫描 `.jsonl` 文件补充
5. **多两个 `style` 属性** → JSX 不允许，合并成一个对象

## 设计系统

基于 Linear 暗色美学：
- 背景 `#08090a`，边框 `rgba(255,255,255,0.06-0.08)`，半透明白色而非实色
- 强调色 `#DA7756`（Claude 品牌橙）
- 字体 Inter + OpenType features `cv01, ss03`
- 字重：400（阅读）/ 510（强调）/ 590（标题）
- 明亮模式通过 `[data-theme="light"]` 切换，变量在 `src/index.css`

## 禁区

- 不要修改 `~/.claude/` 下的任何文件（只读）
- 不要在生产代码中保留 `console.log` 调试输出
- 不要给 Electron 主进程绑定 `nodeIntegration: true`（安全风险）
- 不要移除 `contextIsolation`
