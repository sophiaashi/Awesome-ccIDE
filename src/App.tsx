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
import { Sidebar } from './components/Sidebar'
import { TerminalPanel } from './components/TerminalPanel'
import { initProjectColors } from './utils/color'
import { useEffect, useCallback, useState } from 'react'
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
  /** 侧边栏是否显示（有终端时显示） */
  const sidebarVisible = openTerminals.length > 0

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

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* ========== 左侧面板：Session 列表 ========== */}
      <div
        className="flex flex-col shrink-0 border-r"
        style={{
          width: '420px',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {/* 标题栏拖拽区域（macOS hiddenInset 标题栏） */}
        <div
          className="shrink-0"
          style={{
            height: '38px',
            WebkitAppRegion: 'drag' as any,
          }}
        />

        {/* 标题 */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)' }}>Claude</span>
              <span className="font-normal ml-1.5" style={{ color: 'var(--text-secondary)' }}>Sessions</span>
            </h1>
            {!loading && !error && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: 'var(--accent-dim)',
                  color: 'var(--accent)',
                }}
              >
                {totalCount}
              </span>
            )}
          </div>

          {/* 搜索框 */}
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

        {/* 过滤/排序栏 + 布局控制 */}
        {!loading && !error && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}
          >
            <FilterBar
              projects={projects}
              filterProject={filterProject}
              onFilterProjectChange={setFilterProject}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
            <LayoutBar
              activeLayout={layout}
              onLayoutChange={handleLayoutChange}
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
          />
        </div>
      </div>

      {/* ========== 右侧面板：终端区域 ========== */}
      <div className="flex-1 flex min-w-0 h-full">
        {/* 终端面板 */}
        <TerminalPanel
          terminals={openTerminals}
          layout={layout}
          activeTerminalId={activeTerminalId}
          onCloseTerminal={handleCloseTerminal}
          onActivateTerminal={handleActivateTerminal}
        />

        {/* 侧边栏（列出已打开的终端） */}
        <Sidebar
          visible={sidebarVisible}
          terminals={openTerminals}
          activeTerminalId={activeTerminalId}
          onActivateTerminal={handleActivateTerminal}
          onCloseTerminal={handleCloseTerminal}
        />
      </div>
    </div>
  )
}
