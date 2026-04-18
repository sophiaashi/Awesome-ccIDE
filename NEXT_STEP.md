# 下一步计划

## 已完成

### Sprint 1：项目搭建 + Session 数据展示
- [x] 项目初始化（Vite + React + TailwindCSS + TypeScript + Express）
- [x] 后端：读取所有 sessions-index.json，合并返回 session 列表（177 个）
- [x] 前端：Session 列表页面
- [x] 显示 firstPrompt（截断）、summary、相对时间、项目名、git 分支、消息数
- [x] 项目颜色标识（左侧竖条 + 项目名标签）
- [x] 按 modified 时间倒序排列
- [x] 深色主题，符合 DESIGN.md 设计系统
- [x] Dev server 在 http://localhost:3456 正常运行

## 下一个 Sprint

### Sprint 2：全局搜索 + 过滤
- [ ] 搜索框组件（支持 `Cmd+K` 快捷键聚焦）
- [ ] 实时搜索逻辑：搜索 firstPrompt + summary 字段
- [ ] 项目过滤下拉框
- [ ] 排序切换（最近修改/创建时间/消息数）
- [ ] 搜索结果计数
- [ ] 键盘导航（上下键选择，Enter 确认）
