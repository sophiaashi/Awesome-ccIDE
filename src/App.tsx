// 主应用组件
import { useSessions } from './hooks/useSessions'
import { SessionList } from './components/SessionList'
import { initProjectColors } from './utils/color'
import { useEffect } from 'react'

export default function App() {
  const { sessions, totalCount, projects, loading, error } = useSessions()

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
      {/* 顶部标题栏 */}
      <header
        className="sticky top-0 z-10 border-b px-6 py-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <span style={{ color: 'var(--accent)' }}>Claude</span> Session Manager
            </h1>
          </div>
          {!loading && !error && (
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {totalCount} sessions
            </span>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto">
        <SessionList
          sessions={sessions}
          loading={loading}
          error={error}
          totalCount={totalCount}
        />
      </main>
    </div>
  )
}
