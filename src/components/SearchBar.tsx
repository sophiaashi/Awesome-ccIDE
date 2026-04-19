// 搜索框组件
import type { RefObject } from 'react'

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
  filteredCount: number
  totalCount: number
  inputRef: RefObject<HTMLInputElement | null>
}

export function SearchBar({ query, onQueryChange, filteredCount, totalCount, inputRef }: SearchBarProps) {
  return (
    <div className="search-box relative flex items-center w-full rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      {/* 搜索图标 */}
      <div className="absolute left-4 pointer-events-none" style={{ color: query ? 'var(--accent)' : 'var(--text-muted)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索 session — 名称、内容、历史对话..."
        className="w-full h-12 pl-12 pr-32 text-sm bg-transparent outline-none"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Inter', -apple-system, sans-serif",
          letterSpacing: '0.01em',
        }}
      />

      {/* 右侧：快捷键 + 计数 */}
      <div className="absolute right-4 flex items-center gap-2">
        {!query && (
          <kbd className="px-1.5 py-0.5 rounded text-xs" style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⌘K
          </kbd>
        )}
        <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{
          backgroundColor: query ? 'var(--accent-dim)' : 'var(--bg-primary)',
          color: query ? 'var(--accent)' : 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
        }}>
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  )
}
