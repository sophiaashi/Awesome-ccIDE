# Claude Session Manager — 设计系统

## 设计理念

**Terminal-native aesthetic** — 工具为终端用户设计，视觉语言应与终端环境融合：深色主题、等宽字体、高对比度、信息密度高。不追求花哨，追求效率。

## 色彩系统

### 主色板

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg-primary` | `#0D1117` | 页面背景（GitHub Dark 级别） |
| `--bg-secondary` | `#161B22` | 卡片/面板背景 |
| `--bg-tertiary` | `#21262D` | 悬停状态、输入框背景 |
| `--bg-active` | `#1F6FEB22` | 选中行高亮背景 |
| `--border` | `#30363D` | 边框、分割线 |
| `--border-active` | `#1F6FEB` | 激活边框 |

### 文字色

| Token | 色值 | 用途 |
|-------|------|------|
| `--text-primary` | `#E6EDF3` | 主要文字 |
| `--text-secondary` | `#8B949E` | 次要文字（时间、路径） |
| `--text-muted` | `#484F58` | 占位符、禁用文字 |
| `--text-link` | `#58A6FF` | 链接、可点击文字 |

### 功能色

| Token | 色值 | 用途 |
|-------|------|------|
| `--accent` | `#DA7756` | Claude 品牌橙（主强调色） |
| `--accent-hover` | `#E8956E` | 强调色悬停 |
| `--success` | `#3FB950` | 成功、活跃状态 |
| `--warning` | `#D29922` | 警告 |
| `--info` | `#58A6FF` | 信息提示 |

## 字体

| 用途 | 字体 | 大小 |
|------|------|------|
| 代码/SessionID | `'JetBrains Mono', 'SF Mono', 'Menlo', monospace` | 13px |
| UI 文字 | `'Inter', -apple-system, sans-serif` | 14px |
| 标题 | `'Inter', -apple-system, sans-serif` | 16-20px, font-weight: 600 |
| 小标签 | `'Inter', -apple-system, sans-serif` | 12px |

## 间距系统

基准单位：4px

| Token | 值 |
|-------|----|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |

## 圆角

| Token | 值 | 用途 |
|-------|----|------|
| `--radius-sm` | 4px | 按钮、标签 |
| `--radius-md` | 6px | 卡片、输入框 |
| `--radius-lg` | 8px | 模态框、面板 |

## 组件规范

### 搜索框

- 全宽，高度 40px
- 左侧搜索图标（`--text-muted`）
- 背景 `--bg-tertiary`，聚焦时边框 `--border-active`
- 右侧显示结果数量标签
- 快捷键提示：`⌘K` 聚焦

### Session 列表项

- 高度：auto（最小 60px）
- 左侧：项目名称色块标识（4px 宽竖条，每个项目固定颜色）
- 主体：firstPrompt（单行截断）+ summary（若有，次要色）
- 右侧：时间戳 + messageCount 标签
- 底部元信息行：projectPath（缩短显示）、gitBranch（标签样式）
- 悬停：背景 `--bg-tertiary`，显示「Resume」按钮
- 选中：背景 `--bg-active`，左侧竖条变亮

### 布局切换按钮组

- 水平排列的图标按钮组
- 每个按钮 32x32px，包含布局示意图标
- 激活状态：背景 `--accent`，图标白色
- 非激活：背景透明，图标 `--text-secondary`

### 侧边栏（全屏模式）

- 宽度 280px，可拖拽调整
- 背景 `--bg-secondary`
- Session 列表紧凑模式（行高 40px）
- 顶部搜索框
- 当前活跃 session 高亮

### 标签/徽章

- padding: 2px 8px
- 圆角：`--radius-sm`
- Git 分支标签：背景 `#1F6FEB22`，文字 `--info`
- 消息数标签：背景 `--bg-tertiary`，文字 `--text-secondary`
- 项目标签：各项目固定颜色（从预设色板循环分配）

### 项目颜色预设

用于区分不同项目的色板（左侧竖条、项目标签）：

```
#DA7756  // 橙
#58A6FF  // 蓝
#3FB950  // 绿
#D29922  // 黄
#BC8CFF  // 紫
#F778BA  // 粉
#79C0FF  // 浅蓝
#7EE787  // 浅绿
```

## 布局

### 默认视图（搜索+列表）

```
┌─────────────────────────────────────────────┐
│  🔍 Search sessions...            ⌘K  142   │
├─────────────────────────────────────────────┤
│  [Filter: All ▾] [Sort: Recent ▾] [Layout]  │
├─────────────────────────────────────────────┤
│ ▎ Session firstPrompt text...        2h ago │
│ ▎ Summary text if available      💬 12     │
│ ▎ ~/teamoclaw  main                         │
├─────────────────────────────────────────────┤
│ ▎ Another session prompt...         1d ago  │
│ ▎ ...                                       │
└─────────────────────────────────────────────┘
```

### 全屏+侧边栏模式

```
┌──────────────┬──────────────────────────────┐
│  🔍 Search   │                              │
├──────────────┤                              │
│ ▎ Session 1  │    当前终端全屏展示区域        │
│ ▎ Session 2◀│    （通过 AppleScript 控制     │
│ ▎ Session 3  │     终端窗口置顶）            │
│ ▎ Session 4  │                              │
│ ▎ ...        │                              │
└──────────────┴──────────────────────────────┘
```

## 动效

| 交互 | 动效 | 时长 |
|------|------|------|
| 列表项悬停 | 背景色渐变 | 150ms ease |
| 布局切换 | 窗口位移动画（终端端） | 300ms |
| 侧边栏展开/收起 | 宽度滑入 | 200ms ease-out |
| 搜索结果过滤 | 列表淡入淡出 | 100ms |
| 按钮点击 | scale(0.97) → scale(1) | 100ms |

## 响应式

本工具为桌面端本地使用，固定宽度下限 800px，不考虑移动端适配。

## 快捷键

| 快捷键 | 操作 |
|--------|------|
| `⌘K` | 聚焦搜索框 |
| `↑/↓` | 在搜索结果中上下移动 |
| `Enter` | Resume 选中的 session |
| `⌘1-4` | 切换布局模式 |
| `Escape` | 清空搜索/退出全屏模式 |
