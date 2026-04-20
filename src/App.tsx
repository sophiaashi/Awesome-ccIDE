// 主应用组件 — Electron 桌面应用布局
// 左侧：Session 列表（搜索+过滤）
// 右侧：终端面板区域（xterm.js grid 布局）+ 侧边栏（已打开终端列表）
import { useSessions } from './hooks/useSessions'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { useTabShortcuts } from './hooks/useTabShortcuts'
import { SessionList } from './components/SessionList'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { LayoutBar } from './components/LayoutBar'
import { TabBar } from './components/TabBar'
// Sidebar 已移除 — 左侧列表直接显示已打开状态
import { TerminalPanel } from './components/TerminalPanel'
import { ToolSidebar } from './components/ToolSidebar'
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

  /** 处于闪烁通知态的 sessionId 集合（来自 Claude Code hook） */
  const [notifyingSessionIds, setNotifyingSessionIds] = useState<Set<string>>(new Set())

  /** hook 是否已安装（null=未知 / false=未装 / true=已装） */
  const [hooksInstalled, setHooksInstalled] = useState<boolean | null>(null)
  const [hookBannerDismissed, setHookBannerDismissed] = useState<boolean>(
    () => localStorage.getItem('ccide-hook-banner-dismissed') === '1',
  )
  const [installingHook, setInstallingHook] = useState(false)
  const [hookInstallMsg, setHookInstallMsg] = useState<string>('')

  // ========== 终端操作 ==========

  /**
   * Resume 一个 session — 通过 IPC 创建新的 pty 终端
   */
  const handleResume = useCallback((session: Session) => {
    // 先检查 session 是否已经打开过 — 若已打开则直接激活，不创建新终端
    const existing = openTerminals.find(t => t.sessionId === session.sessionId)
    if (existing) {
      setActiveTerminalId(existing.terminalId)
      return
    }

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
  }, [openTerminals])

  /**
   * 新建 session — 在 home 目录打开一个新终端运行 claude（不 resume）
   */
  const handleNewSession = useCallback(() => {
    ;(async () => {
      try {
        const projectPath = homedir || '/Users/sophia'
        const { terminalId } = await window.electronAPI.terminal.create('', projectPath)

        const terminalInfo: TerminalInfo = {
          terminalId,
          sessionId: '',
          projectPath,
          projectName: 'new',
          firstPrompt: '新 session',
        }
        setOpenTerminals(prev => [...prev, terminalInfo])
        setActiveTerminalId(terminalId)
      } catch (err) {
        console.error('新建 session 失败:', err)
      }
    })()
  }, [homedir])

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

  // 终端 Tab 切换快捷键（⌘1~9 / ⌃Tab / ⌃⇧Tab）
  useTabShortcuts({
    terminals: openTerminals,
    activeTerminalId,
    onActivate: handleActivateTerminal,
  })

  // ========== 通知订阅：Claude Code hook 触发时标记对应 session 闪烁 ==========
  useEffect(() => {
    if (!window.electronAPI?.hooks) return
    const unsub = window.electronAPI.hooks.onNotify(ev => {
      if (!ev.sessionId) return
      setNotifyingSessionIds(prev => {
        if (prev.has(ev.sessionId)) return prev
        const next = new Set(prev)
        next.add(ev.sessionId)
        return next
      })
    })
    return unsub
  }, [])

  /** 清除某个 sessionId 的通知态 */
  const clearNotify = useCallback((sessionId: string) => {
    setNotifyingSessionIds(prev => {
      if (!prev.has(sessionId)) return prev
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })
  }, [])

  /** 激活终端时清除该 session 的通知 */
  useEffect(() => {
    if (!activeTerminalId) return
    const active = openTerminals.find(t => t.terminalId === activeTerminalId)
    if (active?.sessionId) clearNotify(active.sessionId)
  }, [activeTerminalId, openTerminals, clearNotify])

  /** terminal 有新输出（用户/pty 交互）时清除通知 */
  const handleTerminalData = useCallback((terminalId: string) => {
    const t = openTerminals.find(x => x.terminalId === terminalId)
    if (t?.sessionId && notifyingSessionIds.has(t.sessionId)) {
      clearNotify(t.sessionId)
    }
  }, [openTerminals, notifyingSessionIds, clearNotify])

  // ========== hook 安装检查 ==========
  useEffect(() => {
    if (!window.electronAPI?.hooks) return
    window.electronAPI.hooks.check().then(r => {
      setHooksInstalled(r.stopInstalled && r.notifyInstalled)
    }).catch(() => {})
  }, [])

  const installHook = useCallback(async () => {
    setInstallingHook(true)
    setHookInstallMsg('')
    const res = await window.electronAPI.hooks.install()
    setInstallingHook(false)
    if (res.success) {
      setHooksInstalled(true)
      setHookInstallMsg('✓ 已启用')
      setTimeout(() => setHookInstallMsg(''), 2500)
    } else {
      setHookInstallMsg(`失败：${res.error || '未知错误'}`)
    }
  }, [])

  const dismissHookBanner = useCallback(() => {
    setHookBannerDismissed(true)
    localStorage.setItem('ccide-hook-banner-dismissed', '1')
  }, [])

  // 项目颜色初始化
  useEffect(() => {
    if (projects.length > 0) {
      initProjectColors(projects)
    }
  }, [projects])

  // ========== 主题切换 ==========
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ccide-theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ccide-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

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
          width: leftPanelCollapsed ? '80px' : `${sidebarWidth}px`,
          backgroundColor: 'var(--bg-secondary)',
          transition: leftPanelCollapsed ? 'width 0.2s ease' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* macOS 标题栏拖拽区域
         * 收起态下左侧面板只有 80px 宽，但 macOS 红黄绿按钮占约 70px，
         * 如果还在右侧塞 3 个按钮会和 traffic light 物理重叠。
         * 所以收起态时 titlebar 里不放任何按钮（refresh/theme/collapse 都移到展开态/下方）。
         */}
        <div className="shrink-0 flex items-end justify-end gap-1 px-2" style={{ height: '38px', WebkitAppRegion: 'drag' } as React.CSSProperties}>
          {!leftPanelCollapsed && <>
          {/* 刷新 */}
          <button
            onClick={refresh}
            className="cursor-pointer flex items-center justify-center rounded-md mb-1"
            style={{
              width: '24px', height: '24px',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            title="刷新 session 列表"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14" />
            </svg>
          </button>
          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="cursor-pointer flex items-center justify-center rounded-md mb-1"
            style={{
              width: '24px',
              height: '24px',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            title={theme === 'dark' ? '切换到明亮模式' : '切换到暗黑模式'}
          >
            {theme === 'dark' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {/* 收起/展开（只在展开态显示） */}
          <button
            onClick={() => setLeftPanelCollapsed(prev => !prev)}
            className="cursor-pointer flex items-center justify-center rounded-md mb-1"
            style={{
              width: '24px',
              height: '24px',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            title="收起面板"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          </>}
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
            <>
              <SearchBar
                query={query}
                onQueryChange={setQuery}
                filteredCount={filteredCount}
                totalCount={totalCount}
                inputRef={searchInputRef}
              />
              <button
                onClick={handleNewSession}
                className="w-full mt-2 flex items-center justify-center gap-1.5 h-9 rounded-lg cursor-pointer text-[13px] font-[590] transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                新建 Session
              </button>
            </>
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
            paddingLeft: leftPanelCollapsed ? '80px' : '16px',
          }}
        >
          <LayoutBar
            activeLayout={layout}
            onLayoutChange={handleLayoutChange}
          />
        </div>

        {/* Chrome 风格 Tab 栏 — 仅 stack 布局显示 */}
        {layout === 'stack' && (
          <TabBar
            terminals={openTerminals}
            activeTerminalId={activeTerminalId}
            onActivate={handleActivateTerminal}
            onClose={handleCloseTerminal}
          />
        )}

        {/* Hook 启用提示 banner（只在未启用且未被 dismiss 时显示） */}
        {hooksInstalled === false && !hookBannerDismissed && (
          <div
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-[12px]"
            style={{
              background: 'rgba(218,119,86,0.10)',
              borderBottom: '1px solid rgba(218,119,86,0.3)',
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ fontSize: '14px' }}>⚡️</span>
            <span className="flex-1">
              启用「Claude 停止/等待时闪烁提示」？会在你的 <code style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px' }}>~/.claude/settings.json</code> 追加两条 hook（不覆盖现有）。
            </span>
            {hookInstallMsg && (
              <span className="text-[11px] font-[510]" style={{ color: hookInstallMsg.startsWith('✓') ? 'var(--success, #3FB950)' : 'var(--accent)' }}>
                {hookInstallMsg}
              </span>
            )}
            <button
              onClick={installHook}
              disabled={installingHook}
              className="text-[11px] font-[510] px-2.5 h-6 rounded-md cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {installingHook ? '安装中...' : '开启'}
            </button>
            <button
              onClick={dismissHookBanner}
              className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              稍后
            </button>
          </div>
        )}

        {/* 终端面板 */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <TerminalPanel
            terminals={openTerminals}
            layout={layout}
            activeTerminalId={activeTerminalId}
            onCloseTerminal={handleCloseTerminal}
            onActivateTerminal={handleActivateTerminal}
            notifyingSessionIds={notifyingSessionIds}
            onTerminalData={handleTerminalData}
          />
        </div>
      </div>

      {/* ========== 右侧工具栏 ========== */}
      <ToolSidebar
        activeProjectPath={openTerminals.find(t => t.terminalId === activeTerminalId)?.projectPath}
      />
    </div>
  )
}
