# CLAUDE.md — ccIDE 项目专用指令

> 继承自用户全局 `~/.claude/CLAUDE.md` 的所有规则（语言、前端三更、安全红线、Skill 优先、解决问题方式等）。以下是本项目的附加规则。

## 项目概览

**ccIDE** — 管理 Claude Code 历史 session 的 macOS 原生桌面应用。

- 技术栈：Electron + React + TypeScript + xterm.js + node-pty
- 入口：`electron/main.ts` (主进程) / `src/App.tsx` (渲染进程)
- 数据源：`~/.claude/projects/*/sessions-index.json` + `~/.claude/history.jsonl`
- 自定义名称存储：`~/.claude-session-manager/session-names.json`

## 同步规则（用户主导推送节奏）

**默认：只做本地修改 + 本地 .app 更新，不自动推送远端。**

### 每次改动的默认流程（无用户指示时）

```bash
# 1. 编译检查
cd ~/ccIDE && npx tsc --noEmit

# 2. 打包
npm run dist

# 3. 安装到本地 Applications
rm -rf /Applications/ccIDE.app && cp -R release/mac-arm64/ccIDE.app /Applications/

# 4. 本地 git commit（但不 push）
git add -A && git commit -m "..."
```

### 推送远端时的流程（用户说「推送」/「push」/「发布」时）

**一旦推送远端，必须同时更新 DMG Release**：

```bash
# 1. 推送代码
git push origin main

# 2. 更新 GitHub Release DMG（与 push 绑定，不可分离）
gh release delete v1.0.0 --repo sophiaashi/Awesome-ccIDE --yes
gh release create v1.0.0 \
  --repo sophiaashi/Awesome-ccIDE \
  --title "ccIDE v1.0.0" \
  --notes "macOS Apple Silicon (arm64). Download DMG, drag to Applications, done." \
  release/ccIDE-1.0.0-arm64.dmg
```

### 关键规则

- 用户没说「推送」时，**不要自动 `git push`**
- 用户说「推送」时，**必须同时更新 DMG**（push 和 DMG 更新是原子操作）
- 本地 Applications 下的 app 每次改动都要更新（用户会直接测试）

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

## 代码签名（self-signed）

打包用 `ccIDE Dev` self-signed cert（存在用户 login keychain），避免 ad-hoc 签名每次重装权限清零。**如换机或 keychain 重建** 需要重新导入或重新创建：

```bash
# 一次性创建（cert 有效期 10 年）
mkdir -p /tmp/ccide-cert && cd /tmp/ccide-cert
cat > csr.cnf <<'CNF'
[req]
distinguished_name = dn
prompt = no
x509_extensions = v3_code_sign
[dn]
CN = ccIDE Dev
[v3_code_sign]
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = codeSigning
CNF
openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
  -config csr.cnf -keyout key.pem -out cert.pem
openssl pkcs12 -export -legacy -out cert.p12 -inkey key.pem -in cert.pem \
  -name "ccIDE Dev" -passout pass:ccide
security import cert.p12 -k ~/Library/Keychains/login.keychain-db \
  -P ccide -T /usr/bin/codesign -A
security add-trusted-cert -p codeSign \
  -k ~/Library/Keychains/login.keychain-db cert.pem
# 验证
security find-identity -v -p codesigning | grep "ccIDE Dev"
```

关键坑：
- openssl 3.x 默认 p12 格式 macOS `security` 不认，**必须加 `-legacy`**
- cert 必须 `add-trusted-cert` 打 code signing trust 才会被 `codesign` 识别
- p12 空密码 macOS 也不认，所以用 `ccide` 作密码

建议把 `/tmp/ccide-cert/cert.p12` 备份到安全位置（比如 1Password / 加密 U 盘），防止 keychain 意外丢失后需要重建 identity。

## 禁区

- 不要修改 `~/.claude/` 下的任何文件（只读）
- 不要在生产代码中保留 `console.log` 调试输出
- 不要给 Electron 主进程绑定 `nodeIntegration: true`（安全风险）
- 不要移除 `contextIsolation`
