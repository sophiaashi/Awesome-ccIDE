// 搜索框 — Linear 风格：透明背景、半透明边框、聚焦时品牌色辉光
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
    <div className="search-box relative flex items-center w-full">
      {/* 搜索图标 */}
      <div className="absolute left-3.5 pointer-events-none" style={{ color: query ? 'var(--accent)' : 'var(--text-muted)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索 session..."
        className="w-full h-10 pl-10 pr-28 text-[13px] bg-transparent outline-none"
        style={{
          color: 'var(--text-primary)',
          fontWeight: 400,
          letterSpacing: '-0.01em',
        }}
      />

      {/* 右侧 */}
      <div className="absolute right-3 flex items-center gap-2">
        {!query && (
          <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            fontWeight: 510,
          }}>
            ⌘K
          </kbd>
        )}
        <span className="text-[11px] font-[510] tabular-nums" style={{
          color: query ? 'var(--accent)' : 'var(--text-muted)',
          fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        }}>
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  )
}
