# Claude Session Manager — 产品规格与 Sprint 计划

## 产品概述

### 解决什么问题

Claude Code 用户在日常工作中会积累大量 session（当前 177 个），分布在多个项目目录下。现有的 `claude --resume` 需要记住 sessionId 并 cd 到对应目录，无法快速搜索和管理。终端窗口管理也完全靠手动。

### 核心价值

1. **找到** — 用关键词瞬间定位到任何一个历史 session
2. **打开** — 一键在新终端中 resume，不需要记 sessionId 或 cd 目录
3. **排布** — 多个终端窗口自动排列成高效布局

### 目标用户

自己（Sophia），macOS 用户，同时使用多个 Claude Code session 进行开发。

### MVP 范围

- 全局搜索（实时过滤）+ 一键 resume
- 终端布局管理（四宫格、三列等）
- 全屏+侧边栏一键切换终端

### 不在范围内

- 多用户支持
- Session 内容预览/编辑
- 远程 session 管理
- 移动端适配
- 自动化任务/定时操作

---

## 技术方案

### 架构

```
┌─────────────────────┐     HTTP/API      ┌──────────────────────┐
│   React Web App     │ ◄──────────────► │  Node.js Server      │
│   (Vite + Tailwind) │    localhost:3456  │  (Express)           │
│                     │                   │                      │
│  - 搜索 UI          │                   │  - 读取 session 数据  │
│  - 列表展示         │                   │  - 执行终端命令       │
│  - 布局控制面板     │                   │  - AppleScript 控制   │
└─────────────────────┘                   └──────────────────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │  macOS Terminal     │
                                          │  (Terminal.app /    │
                                          │   iTerm2)           │
                                          └────────────────────┘
```

### 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 前端 | React 18 + Vite + TailwindCSS | 快速开发，实时搜索体验好 |
| 后端 | Node.js + Express | 轻量，读文件+执行命令足够 |
| 终端控制 | osascript (AppleScript) | macOS 原生终端窗口控制 |
| 构建 | Vite | 开发体验好，HMR 快 |

### 数据源

- 路径：`~/.claude/projects/*/sessions-index.json`
- 格式：`{ version: 1, entries: [...], originalPath: "..." }`
- Entry 字段：
  - `sessionId`: string (UUID)
  - `fullPath`: string (jsonl 文件路径)
  - `fileMtime`: number (文件修改时间戳，毫秒)
  - `firstPrompt`: string (首条用户消息)
  - `summary`: string | undefined (AI 生成的摘要，约 27% 的 session 有此字段)
  - `messageCount`: number
  - `created`: string (ISO 日期)
  - `modified`: string (ISO 日期)
  - `gitBranch`: string
  - `projectPath`: string (项目绝对路径)
  - `isSidechain`: boolean

### API 设计

#### `GET /api/sessions`

返回所有 session 数据，前端负责搜索过滤。

```json
{
  "sessions": [
    {
      "sessionId": "e0ef770d-...",
      "firstPrompt": "帮我查一下...",
      "summary": "...",
      "messageCount": 6,
      "created": "2026-01-28T16:42:28.449Z",
      "modified": "2026-01-28T16:43:38.105Z",
      "gitBranch": "main",
      "projectPath": "/Users/sophia/teamoclaw",
      "projectName": "teamoclaw",
      "isSidechain": false
    }
  ],
  "totalCount": 177,
  "projects": ["teamoclaw", "claude-code", ...]
}
```

#### `POST /api/resume`

在新终端窗口中 resume 一个 session。

```json
// Request
{ "sessionId": "e0ef770d-...", "projectPath": "/Users/sophia/teamoclaw" }

// Response
{ "success": true, "terminal": "Terminal.app", "windowId": "..." }
```

#### `POST /api/layout`

设置终端窗口布局。

```json
// Request
{ "layout": "quad" | "three-col" | "two-col" | "fullscreen", "terminalApp": "Terminal" | "iTerm2" }

// Response
{ "success": true, "windowCount": 4 }
```

#### `POST /api/focus-window`

将指定终端窗口置顶（全屏模式下切换 session）。

```json
// Request
{ "sessionId": "e0ef770d-..." }

// Response
{ "success": true }
```

#### `GET /api/terminal-status`

获取当前打开的终端窗口列表及其关联的 session。

```json
{
  "terminals": [
    { "windowId": "1", "title": "claude --resume e0ef...", "sessionId": "e0ef770d-..." }
  ],
  "terminalApp": "Terminal"
}
```

---

## Sprint 计划

### Sprint 1：项目搭建 + Session 数据展示

**目标**：能在浏览器中看到所有 session 列表，按时间排序。

**任务**：
1. 初始化项目（Vite + React + TailwindCSS + Express）
2. 后端：读取所有 `sessions-index.json`，合并并返回 session 列表
3. 前端：Session 列表页面，显示 firstPrompt、summary、时间、项目名、分支、消息数
4. 项目颜色标识（左侧竖条）
5. 按 modified 时间倒序排列

**验收标准**：
- [ ] 浏览器打开 `http://localhost:3456`，能看到 session 列表
- [ ] 列表显示 177 个 session（或当前实际数量）
- [ ] 每个 session 显示：firstPrompt（截断）、summary（若有）、相对时间、项目名、git 分支、消息数
- [ ] 不同项目有不同的颜色标识竖条
- [ ] 列表按最近修改时间排序，最新的在最上面

---

### Sprint 2：全局搜索 + 过滤

**目标**：输入关键词能实时过滤 session 列表。

**任务**：
1. 搜索框组件（支持 `⌘K` 快捷键聚焦）
2. 实时搜索逻辑：搜索 firstPrompt + summary 字段，支持中英文
3. 项目过滤下拉框
4. 排序切换（最近修改/创建时间/消息数）
5. 搜索结果计数
6. 键盘导航（↑↓ 选择，Enter 确认）

**验收标准**：
- [ ] 搜索框始终可见，输入文字立即过滤列表（无需按 Enter）
- [ ] 搜索 "帮我" 能找到所有 firstPrompt 包含 "帮我" 的 session
- [ ] 搜索 "npm" 能找到相关 session
- [ ] 项目过滤下拉能按项目筛选
- [ ] 搜索框右侧显示结果数量（如 "23/177"）
- [ ] `⌘K` 能聚焦搜索框
- [ ] ↑↓ 键能在结果中导航，选中项有视觉高亮
- [ ] 清空搜索框显示全部 session

---

### Sprint 3：一键 Resume

**目标**：点击 session 能在新终端窗口中 resume。

**任务**：
1. 后端：检测用户使用 Terminal.app 还是 iTerm2
2. 后端：AppleScript 脚本 — 打开新终端窗口，`cd` 到项目目录，执行 `claude --resume <sessionId>`
3. 前端：session 行悬停显示「Resume」按钮
4. 前端：点击后的加载状态和成功/失败反馈
5. 前端：Enter 键 resume 当前选中的 session

**AppleScript 核心逻辑**（Terminal.app）：
```applescript
tell application "Terminal"
    activate
    do script "cd '/Users/sophia/teamoclaw' && claude --resume e0ef770d-..."
end tell
```

**AppleScript 核心逻辑**（iTerm2）：
```applescript
tell application "iTerm2"
    create window with default profile
    tell current session of current window
        write text "cd '/Users/sophia/teamoclaw' && claude --resume e0ef770d-..."
    end tell
end tell
```

**验收标准**：
- [ ] 鼠标悬停 session 行，右侧出现「Resume」按钮
- [ ] 点击「Resume」，自动打开一个新的终端窗口
- [ ] 新终端窗口中自动 cd 到正确的项目目录并执行 `claude --resume <sessionId>`
- [ ] 点击后 UI 显示 "正在打开..." 状态，随后显示成功提示
- [ ] 在搜索结果中用 ↑↓ 选中后按 Enter，效果与点击 Resume 相同
- [ ] 如果终端 app 未安装或出错，显示错误信息

---

### Sprint 4：终端布局管理

**目标**：一键将当前打开的终端窗口排列成指定布局。

**支持的布局**：
1. **双列** (two-col) — 屏幕左右各一半
2. **三列** (three-col) — 屏幕等分三列
3. **四宫格** (quad) — 2x2 网格
4. **堆叠** (stack) — 所有窗口同等大小居中叠放

**任务**：
1. 后端：获取屏幕分辨率（AppleScript）
2. 后端：获取当前打开的终端窗口列表
3. 后端：按布局计算每个窗口的 position 和 size
4. 后端：AppleScript 批量设置窗口位置大小
5. 前端：布局按钮组，图标直观展示每种布局
6. 前端：当前布局高亮

**验收标准**：
- [ ] 页面顶部显示布局切换按钮组（图标形式）
- [ ] 至少打开 2 个终端窗口的前提下，点击「四宫格」按钮
- [ ] 所有终端窗口自动排列成 2x2 四宫格布局
- [ ] 点击「三列」按钮，终端窗口排列成三列
- [ ] 点击「双列」按钮，终端窗口排列成两列
- [ ] 布局切换后当前激活的布局按钮高亮显示
- [ ] 窗口数量少于布局格子数时也能正常排列（不报错）

---

### Sprint 5：全屏 + 侧边栏模式

**目标**：侧边栏列出所有已打开的 session，点击切换（将对应终端窗口置顶）。

**任务**：
1. 后端：获取当前终端窗口列表，识别哪些是 claude session（通过窗口标题或命令匹配）
2. 后端：AppleScript 将指定窗口全屏/置顶
3. 前端：全屏模式切换按钮
4. 前端：侧边栏组件 — 显示已打开的终端 session 列表
5. 前端：点击侧边栏条目 → 调用 API 将对应终端窗口置顶
6. 前端：当前活跃窗口在侧边栏中高亮
7. 侧边栏可收起/展开

**验收标准**：
- [ ] 点击「全屏模式」按钮，页面切换为侧边栏+主区域布局
- [ ] 侧边栏列出当前打开的终端 session（显示 firstPrompt 摘要）
- [ ] 点击侧边栏中的某个 session，对应的终端窗口被置顶显示
- [ ] 当前活跃的 session 在侧边栏中有高亮标识
- [ ] 侧边栏支持搜索过滤
- [ ] 侧边栏可以通过按钮收起/展开
- [ ] 按 `Escape` 退出全屏模式回到列表视图

---

### Sprint 6：集成测试与收尾

**目标**：确保所有功能协同工作，修复集成问题。

**测试场景**：

1. **搜索 → Resume 流程**
   - [ ] 打开页面，搜索某个关键词
   - [ ] 在结果中用键盘选中一个 session
   - [ ] 按 Enter resume
   - [ ] 终端窗口成功打开并执行 resume 命令

2. **多窗口布局流程**
   - [ ] Resume 4 个不同的 session（打开 4 个终端窗口）
   - [ ] 点击「四宫格」布局按钮
   - [ ] 4 个窗口自动排列成 2x2 网格
   - [ ] 切换到「三列」布局
   - [ ] 窗口重新排列成三列

3. **全屏切换流程**
   - [ ] 切换到全屏模式
   - [ ] 侧边栏显示已打开的 session
   - [ ] 点击不同 session 切换终端窗口
   - [ ] 退出全屏模式，回到列表视图

4. **数据完整性**
   - [ ] 所有 177 个 session 都能显示
   - [ ] 有 summary 的 session 显示 summary
   - [ ] 项目路径、git 分支等信息正确

5. **边界情况**
   - [ ] 没有终端窗口打开时，布局按钮点击给出友好提示
   - [ ] session 数据文件不存在时不崩溃
   - [ ] firstPrompt 非常长时正确截断
   - [ ] 搜索无结果时显示空状态

---

## 项目结构

```
claude-session-manager/
├── SPEC.md                  # 本文件
├── DESIGN.md                # 设计系统
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
├── server/
│   ├── index.ts             # Express 服务入口
│   ├── sessions.ts          # Session 数据读取
│   ├── terminal.ts          # 终端控制（AppleScript）
│   └── applescript/
│       ├── open-terminal.ts    # 打开新终端窗口
│       ├── layout.ts           # 窗口布局控制
│       └── focus-window.ts     # 窗口置顶
├── src/
│   ├── main.tsx             # React 入口
│   ├── App.tsx              # 主组件
│   ├── components/
│   │   ├── SearchBar.tsx       # 搜索框
│   │   ├── SessionList.tsx     # Session 列表
│   │   ├── SessionItem.tsx     # 单个 Session 行
│   │   ├── LayoutBar.tsx       # 布局切换按钮组
│   │   ├── Sidebar.tsx         # 全屏模式侧边栏
│   │   └── FilterBar.tsx       # 过滤/排序栏
│   ├── hooks/
│   │   ├── useSessions.ts     # Session 数据获取
│   │   ├── useSearch.ts       # 搜索逻辑
│   │   └── useKeyboard.ts    # 键盘快捷键
│   ├── types/
│   │   └── session.ts         # 类型定义
│   └── utils/
│       ├── time.ts            # 时间格式化
│       └── color.ts           # 项目颜色分配
└── public/
    └── favicon.svg
```

## 启动方式

```bash
cd ~/claude-session-manager
npm install
npm run dev
# 浏览器打开 http://localhost:3456
```

`npm run dev` 同时启动前端 dev server（Vite，端口 5173 → 代理到 3456）和后端 Express server（端口 3456）。
