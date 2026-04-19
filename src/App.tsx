// 主应用组件 — Electron 桌面应用布局
// 左侧：Session 列表（搜索+过滤）
// 右侧：终端面板区域（xterm.js grid 布局）+ 侧边栏（已打开终端列表）
import { useSessions } from './hooks/useSessions'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { SessionList } from './components/SessionList'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { LayoutBar } from './components/LayoutBar'
// Sidebar 已移除 — 左侧列表直接显示已打开状态
import { TerminalPanel } from './components/TerminalPanel'
import { initProjectColors } from './utils/color'
import { useEffect, useCallback, useState, useRef } from 'react'
import type { Session, LayoutType, TerminalInfo } from './types/session'

export default function App() {
  const { sessions, totalCount, projects, homedir, loading, error, refresh } = useSessions()

  // 搜索与过滤
  const {
    query,
    setQuery,
    filterProject,
    setFilterProject,
    sortMode,
    setSortMode,
    filteredSessions,
    filteredCount,
    searchMatches,
  } = useSearch(sessions)

  // ========== 终端管理状态 ==========

  /** 已打开的终端列表 */
  const [openTerminals, setOpenTerminals] = useState<TerminalInfo[]>([])
  /** 当前激活的终端 ID */
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null)
  /** 终端面板布局 */
  const [layout, setLayout] = useState<LayoutType>('quad')
  /** 已打开终端的 sessionId 集合（用于左侧列表选中态） */
  const openSessionIds = new Set(openTerminals.map(t => t.sessionId))

  /** 通过键盘 Enter 触发 resume 的目标 sessionId */
  const [keyboardResumeId, setKeyboardResumeId] = useState<string | null>(null)

  // ========== 终端操作 ==========

  /**
   * Resume 一个 session — 通过 IPC 创建新的 pty 终端
   */
  const handleResume = useCallback((session: Session) => {
    // 异步创建终端，不阻塞 UI
    ;(async () => {
      try {
        const { terminalId } = await window.electronAPI.terminal.create(
          session.sessionId,
          session.projectPath,
        )

        const terminalInfo: TerminalInfo = {
          terminalId,
          sessionId: session.sessionId,
          projectPath: session.projectPath,
          projectName: session.projectName,
          firstPrompt: session.firstPrompt,
          customName: session.customName,
        }

        setOpenTerminals(prev => [...prev, terminalInfo])
        setActiveTerminalId(terminalId)
      } catch (err) {
        console.error('创建终端失败:', err)
      }
    })()
  }, [])

  /**
   * 关闭终端
   */
  const handleCloseTerminal = useCallback((terminalId: string) => {
    // 通知 main process 关闭 pty
    window.electronAPI.terminal.close(terminalId)

    setOpenTerminals(prev => {
      const next = prev.filter(t => t.terminalId !== terminalId)
      // 如果关闭的是当前激活的终端，切换到最后一个
      setActiveTerminalId(current => {
        if (current === terminalId) {
          return next.length > 0 ? next[next.length - 1].terminalId : null
        }
        return current
      })
      return next
    })
  }, [])

  /**
   * 激活终端
   */
  const handleActivateTerminal = useCallback((terminalId: string) => {
    setActiveTerminalId(terminalId)
  }, [])

  /**
   * 切换布局
   */
  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayout(newLayout)
  }, [])

  // 键盘导航
  const { selectedIndex, searchInputRef } = useKeyboard({
    itemCount: filteredSessions.length,
    onEnter: (index) => {
      const session = filteredSessions[index]
      if (session) {
        setKeyboardResumeId(session.sessionId)
      }
    },
  })

  // 项目颜色初始化
  useEffect(() => {
    if (projects.length > 0) {
      initProjectColors(projects)
    }
  }, [projects])

  // ========== 左侧面板状态 ==========
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(420)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ev.clientX - dragStartX.current
      const newWidth = Math.max(300, Math.min(700, dragStartWidth.current + delta))
      setSidebarWidth(newWidth)
    }
    const onUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* ========== 左侧面板：Session 列表 ========== */}
      <div
        className="flex flex-col shrink-0 relative"
        style={{
          width: leftPanelCollapsed ? '48px' : `${sidebarWidth}px`,
          backgroundColor: 'var(--bg-secondary)',
          transition: leftPanelCollapsed ? 'width 0.2s ease' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* macOS 标题栏拖拽区域 */}
        <div className="shrink-0 flex items-end justify-end px-2" style={{ height: '38px', WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {/* 收起/展开按钮 */}
          <button
            onClick={() => setLeftPanelCollapsed(prev => !prev)}
            className="cursor-pointer flex items-center justify-center rounded-md mb-1"
            style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
              border: '1px solid var(--border)',
            } as React.CSSProperties}
            title={leftPanelCollapsed ? '展开面板' : '收起面板'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {leftPanelCollapsed
                ? <path d="M6 3l5 5-5 5" />
                : <path d="M10 3L5 8l5 5" />
              }
            </svg>
          </button>
        </div>

        {/* 收起状态：只显示图标 */}
        {leftPanelCollapsed && (
          <div className="flex flex-col items-center pt-4 gap-3">
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="cursor-pointer flex items-center justify-center rounded-md"
              style={{
                width: '32px', height: '32px',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}
              title="展开 Session 列表"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <span className="text-[10px] font-[510]" style={{ color: 'var(--text-muted)', writingMode: 'vertical-rl' }}>
              {totalCount} sessions
            </span>
          </div>
        )}

        {/* 展开状态内容 */}
        {!leftPanelCollapsed && <>
        {/* 标题 + 搜索 */}
        <div style={{ paddingLeft: '20px', paddingRight: '16px', paddingBottom: '12px' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[15px] tracking-[-0.3px]" style={{ color: 'var(--text-primary)', fontWeight: 590 }}>
              <span style={{ color: 'var(--accent)' }}>Claude</span>
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '5px' }}>Sessions</span>
            </h1>
            {!loading && !error && (
              <span className="pill text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {totalCount}
              </span>
            )}
          </div>

          {!loading && !error && (
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              filteredCount={filteredCount}
              totalCount={totalCount}
              inputRef={searchInputRef}
            />
          )}
        </div>

        {/* 过滤栏 */}
        {!loading && !error && (
          <div
            className="shrink-0"
            style={{ paddingLeft: '20px', paddingRight: '16px', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}
          >
            <FilterBar
              projects={projects}
              filterProject={filterProject}
              onFilterProjectChange={setFilterProject}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
          </div>
        )}

        {/* Session 列表 */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4">
          <SessionList
            sessions={filteredSessions}
            loading={loading}
            error={error}
            totalCount={totalCount}
            selectedIndex={selectedIndex}
            homedir={homedir}
            onResume={handleResume}
            keyboardResumeId={keyboardResumeId}
            onKeyboardResumeHandled={() => setKeyboardResumeId(null)}
            searchMatches={searchMatches}
            searchQuery={query}
            onNameChanged={refresh}
            openSessionIds={openSessionIds}
            activeSessionId={openTerminals.find(t => t.terminalId === activeTerminalId)?.sessionId}
          />
        </div>
        </>}
      </div>

      {/* ========== 拖拽分隔条 ========== */}
      <div
        className="shrink-0 cursor-col-resize group"
        style={{ width: '5px', position: 'relative' }}
        onMouseDown={handleDragStart}
      >
        {/* 视觉分隔线 */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors"
          style={{ backgroundColor: 'var(--border)' }}
        />
        {/* hover 高亮条 */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'var(--accent)', opacity: undefined }}
        />
      </div>

      {/* ========== 右侧面板：终端区域 ========== */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* 终端区域顶部：布局控制 */}
        <div
          className="shrink-0 flex items-center px-4"
          style={{
            height: '38px',
            borderBottom: '1px solid var(--border)',
            // 收起侧边栏时给 macOS 红绿灯让出空间
            paddingLeft: leftPanelCollapsed ? '80px' : '16px',
          }}
        >
          <LayoutBar
            activeLayout={layout}
            onLayoutChange={handleLayoutChange}
          />
        </div>

        {/* 终端面板 + 侧边栏 */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <TerminalPanel
            terminals={openTerminals}
            layout={layout}
            activeTerminalId={activeTerminalId}
            onCloseTerminal={handleCloseTerminal}
            onActivateTerminal={handleActivateTerminal}
          />

          {/* 右侧 Sidebar 已移除，改为左侧列表中显示选中态 */}
        </div>
      </div>
    </div>
  )
}
