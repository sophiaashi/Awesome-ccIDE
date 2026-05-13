// Chrome 风格 Tab 栏 — 显示所有打开的 session
import { useEffect, useRef, useState } from 'react'
import type { TerminalInfo } from '../types/session'
import { getProjectColor } from '../utils/color'

interface TabBarProps {
  terminals: TerminalInfo[]
  activeTerminalId: string | null
  onActivate: (terminalId: string) => void
  onClose: (terminalId: string) => void
  onRename?: (terminalId: string, name: string) => void
}

export function TabBar({ terminals, activeTerminalId, onActivate, onClose, onRename }: TabBarProps) {
  // 当前正在重命名的 tab id
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingId])

  if (terminals.length === 0) return null

  const startRename = (t: TerminalInfo) => {
    if (!t.sessionId || !onRename) return
    setDraft(t.customName || '')
    setRenamingId(t.terminalId)
  }

  const submitRename = (t: TerminalInfo) => {
    const next = draft.trim()
    setRenamingId(null)
    if (next === (t.customName || '')) return
    onRename?.(t.terminalId, next)
  }

  return (
    <div
      className="flex items-end shrink-0 overflow-x-auto"
      style={{
        height: '36px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 4px',
        gap: '2px',
      }}
    >
      {terminals.map((t) => {
        const isActive = t.terminalId === activeTerminalId
        const color = t.projectName ? getProjectColor(t.projectName) : 'var(--text-muted)'
        const title = t.customName || t.firstPrompt || `Terminal ${t.terminalId}`
        const isRenaming = renamingId === t.terminalId

        return (
          <div
            key={t.terminalId}
            onClick={() => { if (!isRenaming) onActivate(t.terminalId) }}
            onDoubleClick={(e) => { e.stopPropagation(); startRename(t) }}
            className="group flex items-center gap-1.5 px-3 cursor-pointer shrink-0"
            style={{
              height: '30px',
              minWidth: '120px',
              maxWidth: '260px',
              marginTop: '6px',
              borderRadius: '7px 7px 0 0',
              backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
              borderTop: isActive ? '1px solid var(--border)' : '1px solid transparent',
              borderLeft: isActive ? '1px solid var(--border)' : '1px solid transparent',
              borderRight: isActive ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid var(--bg-primary)' : 'none',
              marginBottom: isActive ? '-1px' : '0',
              position: 'relative',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title={t.sessionId ? '双击重命名' : ''}
          >
            {/* 项目色圆点 */}
            <div
              className="shrink-0 rounded-full"
              style={{ width: '6px', height: '6px', backgroundColor: color }}
            />
            {/* 标题 / 重命名输入框 */}
            {isRenaming ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  e.stopPropagation()
                  if (e.key === 'Enter') { e.preventDefault(); submitRename(t) }
                  if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null) }
                }}
                onBlur={() => submitRename(t)}
                placeholder="Session 名称"
                className="flex-1 h-[20px] px-1.5 text-[11px] rounded-[3px] outline-none min-w-0"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-border, rgba(218,119,86,0.5))',
                  fontWeight: 590,
                }}
              />
            ) : (
              <span
                className="text-[12px] truncate flex-1"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: isActive ? 590 : 400,
                }}
                title={title}
              >
                {t.customName ? (
                  <span style={{ color: 'var(--accent)' }}>{title}</span>
                ) : title}
              </span>
            )}
            {/* 关闭按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(t.terminalId) }}
              className="shrink-0 w-[16px] h-[16px] flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              title="关闭"
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
