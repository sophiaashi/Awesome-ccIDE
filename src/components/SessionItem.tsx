// 单个 Session 卡片组件 — 通过 IPC 进行操作
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

function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function shortenPath(fullPath: string, homedir: string): string {
  if (!fullPath || fullPath === '/') return '/'
  if (homedir && fullPath.startsWith(homedir)) {
    return '~' + fullPath.slice(homedir.length)
  }
  return fullPath
}

function highlightText(text: string, query: string): React.ReactElement {
  if (!query.trim()) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{
        backgroundColor: 'var(--accent-dim)',
        color: 'var(--accent)',
        borderRadius: '2px',
        padding: '1px 2px',
        fontWeight: 600,
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SessionItem({
  session, isSelected = false, homedir = '', onResume,
  triggerResume = false, onTriggerResumeHandled,
  searchMatches, searchQuery, onNameChanged,
}: SessionItemProps) {
  const projectColor = getProjectColor(session.projectName)
  const relativeTime = formatRelativeTime(session.modified)
  const itemRef = useRef<HTMLDivElement>(null)

  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(session.customName || '')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isSelected])

  useEffect(() => {
    if (isRenaming && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isRenaming])

  // 通过 IPC 设置名称
  const submitRename = async () => {
    setIsRenaming(false)
    const newName = nameInput.trim()
    if (newName === (session.customName || '')) return
    try {
      await window.electronAPI.sessions.setName(session.sessionId, newName)
      onNameChanged?.()
    } catch {}
  }

  const doResume = async () => {
    if (resumeStatus === 'loading' || !onResume) return
    setResumeStatus('loading')
    setErrorMsg('')
    try {
      onResume(session)
      setResumeStatus('success')
      setTimeout(() => setResumeStatus('idle'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setErrorMsg(message)
      setResumeStatus('error')
      setTimeout(() => { setResumeStatus('idle'); setErrorMsg('') }, 5000)
    }
  }

  useEffect(() => {
    if (triggerResume) {
      onTriggerResumeHandled?.()
      doResume()
    }
  }, [triggerResume])

  return (
    <div
      ref={itemRef}
      className={`session-card group rounded-lg mx-3 mb-2 overflow-hidden cursor-pointer ${isSelected ? 'selected' : ''}`}
      style={{ backgroundColor: isSelected ? 'var(--bg-active)' : 'var(--bg-card)' }}
    >
      <div className="flex items-stretch">
        {/* 左侧项目颜色条 */}
        <div
          className="w-1 shrink-0 rounded-l-lg"
          style={{
            backgroundColor: projectColor,
            opacity: isSelected ? 1 : 0.6,
          }}
        />

        <div className="flex-1 min-w-0 p-4">
          {/* 顶部：名称/命名 + 时间 + Resume */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isRenaming ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitRename() }
                    if (e.key === 'Escape') { e.preventDefault(); setIsRenaming(false); setNameInput(session.customName || '') }
                    e.stopPropagation()
                  }}
                  onBlur={submitRename}
                  placeholder="输入 session 名称..."
                  className="flex-1 h-7 px-2.5 text-sm rounded-md outline-none"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    fontWeight: 600,
                    maxWidth: '400px',
                  }}
                />
              ) : session.customName ? (
                <>
                  <span
                    className="text-sm font-bold truncate cursor-text"
                    style={{ color: 'var(--accent)' }}
                    title="双击重命名"
                    onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true) }}
                  >
                    {searchQuery ? highlightText(session.customName, searchQuery) : session.customName}
                  </span>
                  <button
                    className="name-btn shrink-0 w-5 h-5 flex items-center justify-center rounded cursor-pointer hover:bg-[var(--bg-tertiary)]"
                    onClick={(e) => { e.stopPropagation(); setIsRenaming(true) }}
                    title="重命名"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  className="name-btn shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
                  onClick={(e) => { e.stopPropagation(); setNameInput(''); setIsRenaming(true) }}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  命名
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Resume 按钮 */}
              {resumeStatus === 'loading' ? (
                <span className="tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  正在打开...
                </span>
              ) : resumeStatus === 'success' ? (
                <span className="tag" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
                  已打开
                </span>
              ) : resumeStatus === 'error' ? (
                <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }} title={errorMsg}>
                  {errorMsg || '打开失败'}
                </span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); doResume() }}
                  className="resume-btn tag cursor-pointer"
                  style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
                >
                  Resume
                </button>
              )}

              <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {relativeTime}
              </span>
            </div>
          </div>

          {/* firstPrompt */}
          <p
            className={`text-sm leading-relaxed ${session.customName ? 'mt-0.5' : ''}`}
            style={{
              color: session.customName ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontWeight: session.customName ? 400 : 500,
            }}
            title={session.firstPrompt}
          >
            {searchQuery
              ? highlightText(truncateText(session.firstPrompt, 100), searchQuery)
              : truncateText(session.firstPrompt, 100)
            }
          </p>

          {/* summary */}
          {session.summary && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }} title={session.summary}>
              {searchQuery
                ? highlightText(truncateText(session.summary, 120), searchQuery)
                : truncateText(session.summary, 120)
              }
            </p>
          )}

          {/* 全文搜索匹配片段 */}
          {searchMatches && searchMatches.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchMatches.map((match, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-xs rounded-md px-2 py-1"
                  style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--text-secondary)' }}
                >
                  <span style={{ color: 'var(--accent)', fontSize: '10px', marginTop: '2px', flexShrink: 0 }}>●</span>
                  <span className="truncate" title={match.text}>
                    {searchQuery ? highlightText(match.highlight, searchQuery) : match.highlight}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 元信息标签 */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="tag" style={{ backgroundColor: projectColor + '18', color: projectColor }}>
              {session.projectName}
            </span>
            <span className="text-xs font-mono" style={{
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              fontSize: '11px',
            }}>
              {shortenPath(session.projectPath, homedir)}
            </span>
            {session.gitBranch && (
              <span className="tag" style={{ backgroundColor: 'var(--info-dim)', color: 'var(--info)' }}>
                {session.gitBranch}
              </span>
            )}
            <span className="tag" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {session.messageCount} msgs
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
