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

### Sprint 4：终端布局管理
- [x] 修复 P1 bug：键盘 Enter resume 时 SessionItem 不显示状态反馈
  - 新增 triggerResume/onTriggerResumeHandled 机制，统一按钮点击和键盘 Enter 两条 resume 路径
  - SessionItem 内部 doResume() 方法被两条路径复用，确保 loading/success/error 状态一致
- [x] 后端：POST /api/layout API — 接收布局类型，AppleScript 批量设置窗口位置大小
- [x] 后端：GET /api/terminal-status API — 获取当前终端窗口列表
- [x] 后端：获取屏幕可用区域（python3 + AppKit NSScreen.visibleFrame）
- [x] 后端：获取终端窗口列表（AppleScript 遍历窗口 id 和 name）
- [x] 后端：4 种布局计算逻辑（two-col、three-col、quad、stack）
- [x] 后端：AppleScript 批量设置窗口 bounds
- [x] 后端：完整的参数校验和错误处理
- [x] 前端：LayoutBar 组件 — 水平排列的图标按钮组
- [x] 前端：4 种布局 SVG 图标（双列、三列、四宫格、堆叠）
- [x] 前端：激活状态高亮（背景 --accent，图标白色）
- [x] 前端：点击后 spinner 加载状态
- [x] 前端：无终端窗口时友好提示 toast
- [x] 前端：FilterBar + LayoutBar 集成到同一行

### Sprint 5：全屏 + 侧边栏模式
- [x] 后端：GET /api/terminal-status 增强 — 返回 frontmostWindowId，尝试从窗口标题提取 sessionId 并关联 session 数据（firstPrompt/summary/projectName/projectPath）
- [x] 后端：POST /api/focus-window API — 接收 windowId 或 sessionId，通过 AppleScript 将指定终端窗口置顶（set index of window to 1）
- [x] 后端：extractSessionId() 从窗口标题中提取 UUID 格式的 session ID
- [x] 后端：getFrontmostWindowId() 获取当前最前面的终端窗口 ID
- [x] 后端：完整的参数校验和错误处理
- [x] 前端：LayoutBar 新增「全屏模式」按钮（侧边栏+主区域 SVG 图标，与布局按钮组并排）
- [x] 前端：Sidebar 组件（280px 宽，背景 --bg-secondary）
  - 顶部工具栏：收起按钮 + "终端窗口" 标题 + 窗口数量标签 + 关闭按钮
  - 搜索框过滤已打开的终端 session
  - 列表项紧凑模式（行高 40px），显示 firstPrompt 摘要 + 项目名 + 左侧颜色竖条
  - 点击 → 调用 POST /api/focus-window 将窗口置顶
  - 当前活跃窗口高亮（背景 --bg-active，左侧竖条变亮）
  - 点击时显示 spinner 加载动画
  - 收起状态：48px 窄竖条 + 圆点图标列表
  - 展开/收起动画 200ms ease-out
- [x] 前端：全屏模式切换（列表视图 ↔ 全屏+侧边栏视图）
  - 全屏模式下隐藏 session 列表和顶部栏，显示侧边栏 + 主区域占位
  - 主区域显示 Logo + 操作提示 + 快捷键说明
- [x] 前端：Escape 键退出全屏模式（useKeyboard hook 新增 onEscape 回调）
- [x] 前端：每 3 秒轮询终端状态，实时更新侧边栏列表和活跃窗口高亮

## 下一个 Sprint

### Sprint 6：集成测试与收尾
- [ ] 搜索 → Resume 流程端到端测试
- [ ] 多窗口布局流程测试
- [ ] 全屏切换流程测试
- [ ] 数据完整性验证
- [ ] 边界情况测试
