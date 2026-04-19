// 主应用组件
import { useSessions } from './hooks/useSessions'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { SessionList } from './components/SessionList'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { LayoutBar } from './components/LayoutBar'
import { Sidebar } from './components/Sidebar'
import { initProjectColors } from './utils/color'
import { useEffect, useCallback, useState } from 'react'
import type { Session } from './types/session'

export default function App() {
  const { sessions, totalCount, projects, homedir, loading, error, refresh } = useSessions()

  // 全屏模式状态
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  /**
   * 通过键盘 Enter 触发 resume 时，记录目标 sessionId，
   * 让 SessionItem 组件能感知并显示 loading/success/error 状态
   */
  const [keyboardResumeId, setKeyboardResumeId] = useState<string | null>(null)

  /**
   * 调用后端 API resume 一个 session
   * 在新终端窗口中 cd 到项目目录并执行 claude --resume
   */
  const handleResume = useCallback(async (session: Session) => {
    const response = await fetch('/api/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        projectPath: session.projectPath,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return await response.json()
  }, [])

  /**
   * 切换全屏模式
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  /**
   * 退出全屏模式
   */
  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false)
  }, [])

  // 键盘导航
  const { selectedIndex, searchInputRef } = useKeyboard({
    itemCount: filteredSessions.length,
    // Enter 键 resume 当前选中的 session
    // 通过设置 keyboardResumeId 通知 SessionItem 触发内部状态更新
    onEnter: (index) => {
      const session = filteredSessions[index]
      if (session) {
        setKeyboardResumeId(session.sessionId)
      }
    },
    // Escape 键退出全屏模式
    onEscape: isFullscreen ? exitFullscreen : undefined,
  })

  // 项目颜色初始化（保证颜色分配一致性）
  useEffect(() => {
    if (projects.length > 0) {
      initProjectColors(projects)
    }
  }, [projects])

  // 全屏模式渲染
  if (isFullscreen) {
    return (
      <div
        className="h-screen flex"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* 侧边栏 */}
        <Sidebar
          visible={isFullscreen}
          onExitFullscreen={exitFullscreen}
        />

        {/* 主区域 — 全屏模式下的占位/信息展示 */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="text-center max-w-md px-6">
            {/* Logo */}
            <div className="mb-6">
              <h1
                className="text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <span style={{ color: 'var(--accent)' }}>Claude</span> Session Manager
              </h1>
            </div>

            {/* 提示文字 */}
            <div
              className="mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg
                className="mx-auto mb-3"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                style={{ color: 'var(--text-muted)' }}
              >
                <rect x="4" y="6" width="40" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                <rect x="8" y="10" width="14" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
                <circle cx="31" cy="24" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M34 27L37 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-sm mb-2">
                从左侧侧边栏选择一个终端窗口
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                点击后对应的终端窗口将被置顶显示
              </p>
            </div>

            {/* 快捷键提示 */}
            <div
              className="flex items-center justify-center gap-4 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="flex items-center gap-1">
                <kbd
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                  }}
                >
                  Esc
                </kbd>
                退出全屏
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 默认列表视图渲染
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 顶部标题栏 */}
      <header
        className="sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 pt-5 pb-4">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
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
      </header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto">
        {/* 过滤/排序栏 + 布局控制 */}
        {!loading && !error && (
          <div
            className="flex items-center justify-between px-6 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <FilterBar
              projects={projects}
              filterProject={filterProject}
              onFilterProjectChange={setFilterProject}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
            <LayoutBar
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        )}

        {/* Session 列表 */}
        <div className="pt-2 pb-6">
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
      </main>
    </div>
  )
}
