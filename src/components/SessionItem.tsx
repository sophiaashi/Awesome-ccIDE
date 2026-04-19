// 单个 Session 行组件
import type { Session, SearchMatch } from '../types/session'
import { formatRelativeTime } from '../utils/time'
import { getProjectColor } from '../utils/color'
import React, { useEffect, useRef, useState } from 'react'

/** Resume 操作的状态 */
type ResumeStatus = 'idle' | 'loading' | 'success' | 'error'

interface SessionItemProps {
  session: Session
  /** 是否为选中状态（键盘导航） */
  isSelected?: boolean
  /** 用于 shortenPath 的 home 目录（从 API 动态获取） */
  homedir?: string
  /** Resume 回调（由父组件提供） */
  onResume?: (session: Session) => Promise<void>
  /** 由父组件触发的 resume（键盘 Enter 时使用） */
  triggerResume?: boolean
  /** 通知父组件已接管 triggerResume */
  onTriggerResumeHandled?: () => void
  /** 全文搜索匹配的文本片段 */
  searchMatches?: SearchMatch[]
  /** 当前搜索关键词（用于高亮） */
  searchQuery?: string
}

/**
 * 截断文本到指定长度
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 缩短项目路径显示
 * 例如："/Users/sophia/teamoclaw" → "~/teamoclaw"
 * 使用动态 homedir，不再硬编码
 */
function shortenPath(fullPath: string, homedir: string): string {
  if (!fullPath || fullPath === '/') return '/'
  if (homedir && fullPath.startsWith(homedir)) {
    return '~' + fullPath.slice(homedir.length)
  }
  return fullPath
}

/**
 * 高亮文本中的关键词
 */
function highlightText(text: string, query: string): React.ReactElement {
  if (!query.trim()) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: 'rgba(218, 119, 86, 0.35)', color: 'var(--accent-hover)', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SessionItem({ session, isSelected = false, homedir = '', onResume, triggerResume = false, onTriggerResumeHandled, searchMatches, searchQuery }: SessionItemProps) {
  const projectColor = getProjectColor(session.projectName)
  const relativeTime = formatRelativeTime(session.modified)
  const itemRef = useRef<HTMLDivElement>(null)

  // Resume 按钮状态
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // 选中时自动滚动到可见区域
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isSelected])

  /**
   * 执行 resume 操作并管理 UI 状态
   * 同时被按钮点击和键盘 Enter 两条路径复用
   */
  const doResume = async () => {
    if (resumeStatus === 'loading' || !onResume) return

    setResumeStatus('loading')
    setErrorMsg('')

    try {
      await onResume(session)
      setResumeStatus('success')
      // 2秒后恢复默认状态
      setTimeout(() => setResumeStatus('idle'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setErrorMsg(message)
      setResumeStatus('error')
      // 5秒后恢复默认状态
      setTimeout(() => {
        setResumeStatus('idle')
        setErrorMsg('')
      }, 5000)
    }
  }

  // 响应键盘 Enter 触发的 resume
  useEffect(() => {
    if (triggerResume) {
      onTriggerResumeHandled?.()
      doResume()
    }
  }, [triggerResume])

  // 处理 Resume 点击
  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation()
    doResume()
  }

  // 根据状态渲染按钮文字
  const renderResumeButton = () => {
    if (resumeStatus === 'loading') {
      return (
        <span
          className="text-xs px-3 py-1.5 rounded shrink-0"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
          }}
        >
          正在打开...
        </span>
      )
    }

    if (resumeStatus === 'success') {
      return (
        <span
          className="text-xs px-3 py-1.5 rounded shrink-0"
          style={{
            backgroundColor: 'rgba(63, 185, 80, 0.2)',
            color: 'var(--success)',
            fontSize: '12px',
          }}
        >
          &#10003; 已打开
        </span>
      )
    }

    if (resumeStatus === 'error') {
      return (
        <span
          className="text-xs px-3 py-1.5 rounded shrink-0 max-w-48 truncate"
          style={{
            backgroundColor: 'rgba(218, 119, 86, 0.2)',
            color: 'var(--accent)',
            fontSize: '12px',
          }}
          title={errorMsg}
        >
          {errorMsg || '打开失败'}
        </span>
      )
    }

    // 默认状态：悬停时显示 Resume 按钮
    return (
      <button
        onClick={handleResume}
        className="text-xs px-3 py-1.5 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
        style={{
          backgroundColor: 'var(--accent)',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent)'
        }}
      >
        Resume &#9654;
      </button>
    )
  }

  return (
    <div
      ref={itemRef}
      className="group flex items-stretch border-b transition-colors duration-150 cursor-pointer"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? 'var(--bg-active)' : 'transparent'
      }}
    >
      {/* 左侧项目颜色竖条 */}
      <div
        className="w-1 shrink-0 rounded-l transition-opacity duration-150"
        style={{
          backgroundColor: projectColor,
          opacity: isSelected ? 1 : 0.7,
        }}
      />

      {/* 主体内容 */}
      <div className="flex-1 min-w-0 py-3 px-4">
        {/* 第一行：firstPrompt + Resume 按钮 + 时间 */}
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-sm font-medium truncate flex-1"
            style={{ color: 'var(--text-primary)' }}
            title={session.firstPrompt}
          >
            {truncateText(session.firstPrompt, 100)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {renderResumeButton()}
            <span
              className="text-xs whitespace-nowrap mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {relativeTime}
            </span>
          </div>
        </div>

        {/* 第二行：summary（若有）*/}
        {session.summary && (
          <p
            className="text-xs mt-1 truncate"
            style={{ color: 'var(--text-secondary)' }}
            title={session.summary}
          >
            {searchQuery
              ? highlightText(truncateText(session.summary, 120), searchQuery)
              : truncateText(session.summary, 120)
            }
          </p>
        )}

        {/* 全文搜索匹配片段 */}
        {searchMatches && searchMatches.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {searchMatches.map((match, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span style={{ color: 'var(--accent)', fontSize: '10px', marginTop: '2px', flexShrink: 0 }}>💬</span>
                <span className="truncate" title={match.text}>
                  {searchQuery
                    ? highlightText(match.highlight, searchQuery)
                    : match.highlight
                  }
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 第三行：元信息 */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* 项目名标签 */}
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: projectColor + '22',
              color: projectColor,
            }}
          >
            {session.projectName}
          </span>

          {/* 项目路径 */}
          <span
            className="text-xs font-mono"
            style={{
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
              fontSize: '12px',
            }}
          >
            {shortenPath(session.projectPath, homedir)}
          </span>

          {/* Git 分支标签 */}
          {session.gitBranch && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(31, 111, 235, 0.133)',
                color: 'var(--info)',
                fontFamily: "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
                fontSize: '12px',
              }}
            >
              {session.gitBranch}
            </span>
          )}

          {/* 消息数标签 */}
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
            }}
          >
            {session.messageCount} msgs
          </span>
        </div>
      </div>
    </div>
  )
}
