// 全屏模式侧边栏组件 — 显示已打开的终端 session 列表
import { useState, useEffect, useCallback, useRef } from 'react'
import { getProjectColor } from '../utils/color'

/** 终端窗口数据（来自 /api/terminal-status） */
export interface TerminalInfo {
  windowId: string
  title: string
  sessionId?: string
  firstPrompt?: string
  summary?: string
  projectName?: string
  projectPath?: string
}

interface SidebarProps {
  /** 是否显示侧边栏 */
  visible: boolean
  /** 退出全屏模式回调 */
  onExitFullscreen: () => void
}

/**
 * 截断文本到指定长度
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function Sidebar({ visible, onExitFullscreen }: SidebarProps) {
  // 终端窗口列表
  const [terminals, setTerminals] = useState<TerminalInfo[]>([])
  // 当前最前面的窗口 ID
  const [frontmostWindowId, setFrontmostWindowId] = useState<string | undefined>()
  // 侧边栏是否收起
  const [collapsed, setCollapsed] = useState(false)
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('')
  // 加载状态
  const [loading, setLoading] = useState(false)
  // 正在聚焦的窗口 ID（点击后的临时状态）
  const [focusingWindowId, setFocusingWindowId] = useState<string | null>(null)
  // 轮询定时器 ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 搜索框 ref
  const searchInputRef = useRef<HTMLInputElement>(null)

  /**
   * 获取终端窗口状态
   */
  const fetchTerminalStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/terminal-status')
      if (!response.ok) return

      const data = await response.json()
      setTerminals(data.terminals || [])
      setFrontmostWindowId(data.frontmostWindowId)
    } catch {
      // 静默失败
    }
  }, [])

  // 侧边栏可见时开始轮询终端状态（每 3 秒）
  useEffect(() => {
    if (!visible) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    // 立即获取一次
    setLoading(true)
    fetchTerminalStatus().finally(() => setLoading(false))

    // 开始轮询
    pollRef.current = setInterval(fetchTerminalStatus, 3000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [visible, fetchTerminalStatus])

  /**
   * 点击侧边栏条目 → 调用 API 将窗口置顶
   */
  const handleFocusWindow = useCallback(async (terminal: TerminalInfo) => {
    if (focusingWindowId) return // 防止重复点击

    setFocusingWindowId(terminal.windowId)

    try {
      const body: Record<string, string> = {}
      if (terminal.sessionId) {
        body.sessionId = terminal.sessionId
      } else {
        body.windowId = terminal.windowId
      }

      const response = await fetch('/api/focus-window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // 更新 frontmost 状态
        setFrontmostWindowId(terminal.windowId)
      }
    } catch {
      // 静默失败
    } finally {
      setTimeout(() => setFocusingWindowId(null), 300)
    }
  }, [focusingWindowId])

  // 过滤终端列表
  const filteredTerminals = searchQuery.trim()
    ? terminals.filter(t => {
        const q = searchQuery.trim().toLowerCase()
        const titleMatch = t.title?.toLowerCase().includes(q)
        const promptMatch = t.firstPrompt?.toLowerCase().includes(q)
        const summaryMatch = t.summary?.toLowerCase().includes(q)
        const projectMatch = t.projectName?.toLowerCase().includes(q)
        return titleMatch || promptMatch || summaryMatch || projectMatch
      })
    : terminals

  if (!visible) return null

  // 收起状态 — 只显示窄竖条
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center shrink-0 border-r"
        style={{
          width: '48px',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          transition: 'width 200ms ease-out',
        }}
      >
        {/* 展开按钮 */}
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center mt-3 cursor-pointer"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="展开侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 收起状态的竖条图标列表 */}
        <div className="mt-4 flex flex-col gap-1 items-center w-full">
          {terminals.map((t) => {
            const isActive = t.windowId === frontmostWindowId
            const color = t.projectName ? getProjectColor(t.projectName) : 'var(--text-muted)'
            return (
              <button
                key={t.windowId}
                onClick={() => handleFocusWindow(t)}
                className="w-full flex items-center justify-center cursor-pointer"
                style={{
                  height: '32px',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={t.firstPrompt || t.title}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.5,
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 展开状态 — 完整侧边栏
  return (
    <div
      className="flex flex-col shrink-0 border-r h-full"
      style={{
        width: '280px',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        transition: 'width 200ms ease-out',
      }}
    >
      {/* 顶部工具栏：收起按钮 + 标题 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {/* 收起按钮 */}
          <button
            onClick={() => setCollapsed(true)}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="收起侧边栏"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            终端窗口
          </span>

          {/* 窗口数量标签 */}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}
          >
            {terminals.length}
          </span>
        </div>

        {/* 退出全屏按钮 */}
        <button
          onClick={onExitFullscreen}
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="退出全屏模式 (Esc)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: 'var(--text-muted)' }}
          >
            <path
              d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.646 11.354a6 6 0 1 1 .708-.708l3.5 3.5a.5.5 0 0 1-.708.708l-3.5-3.5Z"
              fill="currentColor"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="过滤..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-active)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />
        </div>
      </div>

      {/* 终端 session 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div
            className="flex items-center justify-center py-8"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xs">加载中...</span>
          </div>
        ) : filteredTerminals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 px-4"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xs text-center">
              {terminals.length === 0
                ? '没有打开的终端窗口'
                : '没有匹配的窗口'}
            </span>
            {terminals.length === 0 && (
              <span
                className="text-xs mt-1 text-center"
                style={{ color: 'var(--text-muted)', fontSize: '11px' }}
              >
                先在列表中 Resume 一些 session
              </span>
            )}
          </div>
        ) : (
          filteredTerminals.map((terminal) => {
            const isActive = terminal.windowId === frontmostWindowId
            const isFocusing = terminal.windowId === focusingWindowId
            const projectColor = terminal.projectName
              ? getProjectColor(terminal.projectName)
              : 'var(--text-muted)'

            // 显示文本：优先用 firstPrompt，其次 title
            const displayText = terminal.firstPrompt
              ? truncateText(terminal.firstPrompt, 40)
              : truncateText(terminal.title, 40)

            return (
              <button
                key={terminal.windowId}
                onClick={() => handleFocusWindow(terminal)}
                disabled={isFocusing}
                className="w-full flex items-stretch text-left cursor-pointer transition-colors duration-150"
                style={{
                  height: '40px',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? 'var(--bg-active)' : 'transparent'
                }}
              >
                {/* 左侧项目颜色竖条 */}
                <div
                  className="shrink-0"
                  style={{
                    width: '3px',
                    backgroundColor: projectColor,
                    opacity: isActive ? 1 : 0.4,
                    transition: 'opacity 150ms ease',
                  }}
                />

                {/* 内容区 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                  {/* 主标题 */}
                  <span
                    className="text-xs truncate block"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                    }}
                  >
                    {displayText}
                  </span>

                  {/* 副标题（项目名） */}
                  {terminal.projectName && (
                    <span
                      className="text-xs truncate block"
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        lineHeight: '14px',
                      }}
                    >
                      {terminal.projectName}
                    </span>
                  )}
                </div>

                {/* 聚焦指示器 */}
                {isFocusing && (
                  <div className="flex items-center pr-2">
                    <svg
                      className="animate-spin"
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="20 14"
                      />
                    </svg>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
