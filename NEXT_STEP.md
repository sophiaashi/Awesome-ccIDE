# 下一步计划

## 已完成

### Sprint 1：项目搭建 + Session 数据展示
- [x] 项目初始化（Vite + React + TailwindCSS + TypeScript + Express）
- [x] 后端：读取所有 sessions-index.json，合并返回 session 列表
- [x] 前端：Session 列表页面
- [x] 显示 firstPrompt（截断）、summary、相对时间、项目名、git 分支、消息数
- [x] 项目颜色标识（左侧竖条 + 项目名标签）
- [x] 按 modified 时间倒序排列
- [x] 深色主题，符合 DESIGN.md 设计系统
- [x] Dev server 在 http://localhost:3456 正常运行

### Sprint 2：全局搜索 + 过滤
- [x] SearchBar 组件 — 全宽搜索框，左侧搜索图标，右侧结果计数
- [x] 实时搜索逻辑（useSearch hook）— 搜索 firstPrompt + summary 字段，支持中英文
- [x] FilterBar 组件 — 项目过滤下拉框 + 排序切换（最近修改/创建时间/消息数）
- [x] 键盘导航（useKeyboard hook）— ⌘K 聚焦搜索框，↑↓ 列表导航，Enter 确认
- [x] 搜索结果计数（如 "18/175"）
- [x] 选中行视觉高亮（背景 --bg-active）+ 自动滚动到可见区域
- [x] 搜索无结果时显示友好空状态
- [x] 修复 P2 问题：shortenPath 不再硬编码，改为从 API 动态获取 homedir
- [x] 修复 session 去重问题（同一 sessionId 出现在多个 index 文件中）

### Sprint 3：一键 Resume
- [x] 后端：检测用户使用 Terminal.app 还是 iTerm2（检查 /Applications/iTerm.app）
- [x] 后端：POST /api/resume API — 接收 sessionId + projectPath，通过 AppleScript 打开新终端窗口
- [x] 后端：AppleScript 脚本 — 打开新终端窗口，cd 到项目目录，执行 claude --resume
- [x] 后端：安全的 AppleScript 执行方式（execFile + stdin，避免 shell 注入）
- [x] 后端：完整的参数校验和错误处理
- [x] 前端：session 行悬停显示「Resume ▶」按钮（#DA7756 品牌橙，悬停 #E8956E）
- [x] 前端：点击后显示 "正在打开..." 加载状态
- [x] 前端：成功后显示 "✓ 已打开" 提示（2秒后消失）
- [x] 前端：失败时显示错误信息（5秒后消失）
- [x] 前端：Enter 键 resume 当前选中的 session（接入 useKeyboard hook）

## 下一个 Sprint

### Sprint 4：终端布局管理
- [ ] 后端：获取屏幕分辨率（AppleScript）
- [ ] 后端：获取当前打开的终端窗口列表
- [ ] 后端：按布局计算每个窗口的 position 和 size
- [ ] 后端：AppleScript 批量设置窗口位置大小
- [ ] 前端：布局按钮组，图标直观展示每种布局
- [ ] 前端：当前布局高亮
