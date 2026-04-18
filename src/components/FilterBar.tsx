// 过滤/排序栏组件
import type { SortMode } from '../types/session'

interface FilterBarProps {
  /** 可选的项目列表 */
  projects: string[]
  /** 当前选中的项目过滤 */
  filterProject: string
  /** 更新项目过滤 */
  onFilterProjectChange: (project: string) => void
  /** 当前排序方式 */
  sortMode: SortMode
  /** 更新排序方式 */
  onSortModeChange: (mode: SortMode) => void
}

/** 排序方式的中文标签 */
const SORT_LABELS: Record<SortMode, string> = {
  modified: '最近修改',
  created: '创建时间',
  messageCount: '消息数',
}

export function FilterBar({
  projects,
  filterProject,
  onFilterProjectChange,
  sortMode,
  onSortModeChange,
}: FilterBarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-xs"
    >
      {/* 项目过滤下拉 */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--text-muted)' }}>项目</span>
        <select
          value={filterProject}
          onChange={(e) => onFilterProjectChange(e.target.value)}
          className="text-xs px-2 py-1 rounded cursor-pointer outline-none"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <option value="">全部项目</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* 分隔线 */}
      <div
        className="h-4 w-px"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* 排序切换 */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--text-muted)' }}>排序</span>
        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as SortMode)}
          className="text-xs px-2 py-1 rounded cursor-pointer outline-none"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {SORT_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
