// Session 卡片 — 简洁布局，底色区分状态
import type { Session, SearchMatch } from '../types/session'
import { formatRelativeTime } from '../utils/time'
import React, { useEffect, useRef, useState } from 'react'

type ResumeStatus = 'idle' | 'loading' | 'success' | 'error'

interface SessionItemProps {
  session: Session
  isSelected?: boolean
  homedir?: string
  onResume?: (session: Session) => void
  triggerResume?: boolean
  onTriggerResumeHandled?: () => void
  searchMatches?: SearchMatch[]
  searchQuery?: string
  onNameChanged?: () => void
  isOpen?: boolean
  isActive?: boolean
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length <= max ? text : text.slice(0, max) + '...'
}

function shortenPath(p: string, home: string): string {
  if (!p || p === '/') return '/'
  return home && p.startsWith(home) ? '~' + p.slice(home.length) : p
}

function highlight(text: string, query: string): React.ReactElement {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent)', fontWeight: 590 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SessionItem({
  session, isSelected = false, homedir = '', onResume,
  triggerResume = false, onTriggerResumeHandled,
  searchMatches, searchQuery, onNameChanged,
  isOpen = false, isActive = false,
}: SessionItemProps) {
  const time = formatRelativeTime(session.modified)
  const ref = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<ResumeStatus>('idle')
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal] = useState(session.customName || '')

  useEffect(() => {
    if (isSelected && ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [isSelected])

  useEffect(() => {
    if (renaming && nameRef.current) { nameRef.current.focus(); nameRef.current.select() }
  }, [renaming])

  const submitName = async () => {
    setRenaming(false)
    const n = nameVal.trim()
    if (n === (session.customName || '')) return
    try {
      await window.electronAPI.sessions.setName(session.sessionId, n)
      onNameChanged?.()
    } catch {}
  }

  const doResume = () => {
    if (status === 'loading' || !onResume) return
    setStatus('loading'); setError('')
    try {
      onResume(session)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误')
      setStatus('error')
      setTimeout(() => { setStatus('idle'); setError('') }, 5000)
    }
  }

  useEffect(() => {
    if (triggerResume) { onTriggerResumeHandled?.(); doResume() }
  }, [triggerResume])

  return (
    <div
      ref={ref}
      onClick={() => { if (renaming) return; if (isOpen) doResume() }}
      className={`session-card group ml-5 mr-4 mb-1.5 ${isOpen ? 'cursor-pointer' : ''} ${isSelected ? 'selected' : ''} ${isActive ? 'is-active' : isOpen ? 'is-open' : ''}`}
    >
      <div className="flex flex-col">
        {/* 自定义名称横条（顶部独立区块） */}
        {session.customName && !renaming && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-text"
            style={{
              backgroundColor: isActive ? 'rgba(218,119,86,0.12)' : 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--border)',
            }}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
            title="双击重命名"
          >
            <span className="text-[12px] font-[590] truncate" style={{ color: 'var(--accent)' }}>
              {searchQuery ? highlight(session.customName, searchQuery) : session.customName}
            </span>
            <button
              className="name-btn shrink-0 w-[16px] h-[16px] flex items-center justify-center rounded-[3px] cursor-pointer"
              onClick={e => { e.stopPropagation(); setRenaming(true) }}
            >
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
              </svg>
            </button>
          </div>
        )}

        {/* 主内容行 */}
        <div className="flex items-stretch">
          {/* 左侧色条 */}
          <div className="w-[3px] shrink-0" style={{
            backgroundColor: isActive ? 'var(--accent)' : isOpen ? 'var(--success)' : 'var(--border)',
            opacity: isActive || isOpen ? 1 : 0.4,
            borderRadius: session.customName ? '0' : '8px 0 0 8px',
          }} />

          {/* 内容 */}
          <div className="flex-1 min-w-0 py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
          {/* 行1：状态 + 时间 + 按钮 */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* 打开状态指示 */}
              {isOpen && (
                <span className="text-[10px] font-[510]" style={{
                  color: isActive ? 'var(--accent)' : 'var(--success)',
                }}>
                  {isActive ? '● 当前' : '● 运行中'}
                </span>
              )}

              {/* 重命名输入框 */}
              {renaming && (
                <input
                  ref={nameRef}
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); submitName() }
                    if (e.key === 'Escape') { e.preventDefault(); setRenaming(false); setNameVal(session.customName || '') }
                    e.stopPropagation()
                  }}
                  onBlur={submitName}
                  placeholder="Session 名称..."
                  className="flex-1 h-6 px-2 text-[12px] rounded-[4px] outline-none max-w-[260px]"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontWeight: 590 }}
                />
              )}

              {/* 无名称时的命名按钮 */}
              {!renaming && !session.customName && (
                <button
                  className="name-btn shrink-0 text-[10px] font-[510] cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={e => { e.stopPropagation(); setNameVal(''); setRenaming(true) }}
                >
                  + 命名
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Resume / 切换 按钮 */}
              {status === 'loading' ? (
                <span className="text-[10px] font-[510]" style={{ color: 'var(--text-muted)' }}>打开中...</span>
              ) : status === 'success' ? (
                <span className="text-[10px] font-[510]" style={{ color: 'var(--success)' }}>已打开</span>
              ) : status === 'error' ? (
                <span className="text-[10px] font-[510]" style={{ color: 'var(--accent)' }}>{error || '失败'}</span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); doResume() }}
                  className={isOpen ? 'text-[10px] font-[510] cursor-pointer' : 'resume-btn text-[10px] font-[510] cursor-pointer px-2 py-0.5 rounded-[4px]'}
                  style={{
                    background: isOpen ? 'transparent' : 'var(--accent)',
                    color: isOpen ? 'var(--text-muted)' : '#fff',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--accent-hover)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'var(--accent)' }}
                >
                  {isOpen ? '切换' : 'Resume'}
                </button>
              )}
              <span className="text-[10px] font-[510] tabular-nums" style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
                {time}
              </span>
            </div>
          </div>

          {/* 行2：firstPrompt */}
          <p
            className="text-[13px] leading-[1.5] truncate"
            style={{
              color: 'var(--text-secondary)',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
            title={session.firstPrompt}
          >
            {searchQuery ? highlight(truncate(session.firstPrompt, 85), searchQuery) : truncate(session.firstPrompt, 85)}
          </p>

          {/* summary */}
          {session.summary && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? highlight(truncate(session.summary, 90), searchQuery) : truncate(session.summary, 90)}
            </p>
          )}

          {/* 全文搜索匹配 */}
          {searchMatches && searchMatches.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {searchMatches.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] rounded-[3px] px-1.5 py-0.5"
                  style={{ background: 'var(--accent-dim)', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '7px', marginTop: '3px', flexShrink: 0 }}>●</span>
                  <span className="truncate">{searchQuery ? highlight(m.highlight, searchQuery) : m.highlight}</span>
                </div>
              ))}
            </div>
          )}

          {/* 元信息 — 纯灰色，无彩色标签 */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] font-[510]" style={{ color: 'var(--text-muted)' }}>
              {session.projectName}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>·</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
              {shortenPath(session.projectPath, homedir)}
            </span>
            {session.messageCount > 0 && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>·</span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {session.messageCount} msgs
                </span>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
