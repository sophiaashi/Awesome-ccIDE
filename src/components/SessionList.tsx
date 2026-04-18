// Session 列表组件
import type { Session } from '../types/session'
import { SessionItem } from './SessionItem'

interface SessionListProps {
  sessions: Session[]
  loading: boolean
  error: string | null
  totalCount: number
}

export function SessionList({ sessions, loading, error, totalCount }: SessionListProps) {
  // 加载中状态
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="text-center">
          <div className="text-lg mb-2">加载中...</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            正在读取 session 数据
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={{ color: 'var(--accent)' }}
      >
        <div className="text-center">
          <div className="text-lg mb-2">加载失败</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </div>
        </div>
      </div>
    )
  }

  // 空状态
  if (sessions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="text-center">
          <div className="text-lg mb-2">没有找到 session</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            请确认 ~/.claude/projects/ 目录下有 sessions-index.json 文件
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 列表头部信息 */}
      <div
        className="px-4 py-2 text-xs flex justify-between items-center border-b"
        style={{
          color: 'var(--text-muted)',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <span>共 {totalCount} 个 session</span>
        <span>按最近修改时间排序</span>
      </div>

      {/* Session 列表 */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {sessions.map((session) => (
          <SessionItem key={session.sessionId} session={session} />
        ))}
      </div>
    </div>
  )
}
