// 搜索框组件
import type { RefObject } from 'react'

interface SearchBarProps {
  /** 搜索关键词 */
  query: string
  /** 更新搜索关键词 */
  onQueryChange: (q: string) => void
  /** 过滤后的数量 */
  filteredCount: number
  /** 总数量 */
  totalCount: number
  /** 搜索框 ref（用于键盘聚焦） */
  inputRef: RefObject<HTMLInputElement | null>
}

export function SearchBar({
  query,
  onQueryChange,
  filteredCount,
  totalCount,
  inputRef,
}: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      {/* 左侧搜索图标 */}
      <svg
        className="absolute left-3 pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--text-muted)' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索 session...    ⌘K"
        className="w-full h-10 pl-9 pr-24 text-sm rounded-md outline-none transition-colors duration-150"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-active)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      />

      {/* 右侧结果数量标签 */}
      <div
        className="absolute right-3 flex items-center gap-1 text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span
          className="px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--bg-primary)',
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
            fontSize: '12px',
          }}
        >
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  )
}
