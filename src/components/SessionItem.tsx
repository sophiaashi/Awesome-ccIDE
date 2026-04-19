// Session 卡片 — Linear 风格：半透明背景、亮度层级、克制动效
import type { Session, SearchMatch } from '../types/session'
import { formatRelativeTime } from '../utils/time'
import { getProjectColor } from '../utils/color'
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
}: SessionItemProps) {
  const color = getProjectColor(session.projectName)
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

  const resume = () => {
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
    if (triggerResume) { onTriggerResumeHandled?.(); resume() }
  }, [triggerResume])

  return (
    <div
      ref={ref}
      className={`session-card group mx-2.5 mb-1.5 cursor-pointer ${isSelected ? 'selected' : ''}`}
    >
      <div className="flex items-stretch">
        {/* 项目色条 */}
        <div className="w-[3px] shrink-0 rounded-l-lg" style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.5 }} />

        <div className="flex-1 min-w-0 px-3.5 py-3">
          {/* 行1：名称 + 时间 + Resume */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {renaming ? (
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
                  className="flex-1 h-6 px-2 text-[13px] rounded-[5px] outline-none max-w-[320px]"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontWeight: 590 }}
                />
              ) : session.customName ? (
                <>
                  <span
                    className="text-[13px] font-[590] truncate cursor-text"
                    style={{ color: 'var(--accent)', letterSpacing: '-0.01em' }}
                    onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
                  >
                    {searchQuery ? highlight(session.customName, searchQuery) : session.customName}
                  </span>
                  <button
                    className="name-btn shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[4px] cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    onClick={e => { e.stopPropagation(); setRenaming(true) }}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  className="name-btn shrink-0 flex items-center gap-1 px-1.5 py-px rounded-[4px] text-[10px] font-[510] cursor-pointer"
                  style={{ color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)' }}
                  onClick={e => { e.stopPropagation(); setNameVal(''); setRenaming(true) }}
                >
                  + 命名
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {status === 'loading' ? (
                <span className="tag" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>打开中...</span>
              ) : status === 'success' ? (
                <span className="tag" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>已打开</span>
              ) : status === 'error' ? (
                <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }} title={error}>{error || '失败'}</span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); resume() }}
                  className="resume-btn tag cursor-pointer"
                  style={{ background: 'var(--accent)', color: '#fff', fontWeight: 590 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
                >
                  Resume
                </button>
              )}
              <span className="text-[11px] font-[510] tabular-nums" style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
                {time}
              </span>
            </div>
          </div>

          {/* 行2：firstPrompt */}
          <p
            className="text-[13px] leading-[1.5] truncate"
            style={{
              color: session.customName ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              fontWeight: session.customName ? 400 : 510,
              letterSpacing: '-0.01em',
            }}
            title={session.firstPrompt}
          >
            {searchQuery ? highlight(truncate(session.firstPrompt, 90), searchQuery) : truncate(session.firstPrompt, 90)}
          </p>

          {/* summary */}
          {session.summary && (
            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>
              {searchQuery ? highlight(truncate(session.summary, 100), searchQuery) : truncate(session.summary, 100)}
            </p>
          )}

          {/* 全文搜索匹配 */}
          {searchMatches && searchMatches.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {searchMatches.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] rounded-[4px] px-2 py-1"
                  style={{ background: 'var(--accent-dim)', color: 'var(--text-tertiary)' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '8px', marginTop: '3px', flexShrink: 0 }}>●</span>
                  <span className="truncate">{searchQuery ? highlight(m.highlight, searchQuery) : m.highlight}</span>
                </div>
              ))}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="tag" style={{ background: color + '14', color }}>
              {session.projectName}
            </span>
            <span className="text-[10px] font-[510]" style={{
              color: 'var(--text-muted)',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            }}>
              {shortenPath(session.projectPath, homedir)}
            </span>
            {session.gitBranch && (
              <span className="tag" style={{ background: 'var(--info-dim)', color: 'var(--info)' }}>
                {session.gitBranch}
              </span>
            )}
            <span className="text-[10px] font-[510] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {session.messageCount} msgs
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
