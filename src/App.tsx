// 主应用组件
import { useSessions } from './hooks/useSessions'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { SessionList } from './components/SessionList'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { initProjectColors } from './utils/color'
import { useEffect } from 'react'

export default function App() {
  const { sessions, totalCount, projects, homedir, loading, error } = useSessions()

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
  } = useSearch(sessions)

  // 键盘导航
  const { selectedIndex, searchInputRef } = useKeyboard({
    itemCount: filteredSessions.length,
    // Enter 确认（Sprint 3 实现 resume 功能后接入）
    onEnter: (_index) => {
      // TODO: Sprint 3 实现 resume 功能
    },
  })

  // 项目颜色初始化（保证颜色分配一致性）
  useEffect(() => {
    if (projects.length > 0) {
      initProjectColors(projects)
    }
  }, [projects])

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* 顶部标题栏 + 搜索框 */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-3">
            <h1
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <span style={{ color: 'var(--accent)' }}>Claude</span> Session Manager
            </h1>
            {!loading && !error && (
              <span
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {totalCount} sessions
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
        {/* 过滤/排序栏 */}
        {!loading && !error && (
          <FilterBar
            projects={projects}
            filterProject={filterProject}
            onFilterProjectChange={setFilterProject}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
          />
        )}

        {/* Session 列表 */}
        <SessionList
          sessions={filteredSessions}
          loading={loading}
          error={error}
          totalCount={totalCount}
          selectedIndex={selectedIndex}
          homedir={homedir}
        />
      </main>
    </div>
  )
}
