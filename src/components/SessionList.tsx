// Session 列表组件
import type { Session } from '../types/session'
import { SessionItem } from './SessionItem'

interface SessionListProps {
  sessions: Session[]
  loading: boolean
  error: string | null
  totalCount: number
  /** 当前选中的索引（键盘导航） */
  selectedIndex?: number
  /** 用于 shortenPath 的 home 目录 */
  homedir?: string
}

export function SessionList({
  sessions,
  loading,
  error,
  totalCount,
  selectedIndex = -1,
  homedir = '',
}: SessionListProps) {
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

  // 空状态（搜索无结果 vs 完全没有数据）
  if (sessions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="text-center">
          <div className="text-lg mb-2">
            {totalCount > 0 ? '没有匹配的结果' : '没有找到 session'}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {totalCount > 0
              ? '试试调整搜索关键词或过滤条件'
              : '请确认 ~/.claude/projects/ 目录下有 sessions-index.json 文件'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Session 列表 */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        {sessions.map((session, index) => (
          <SessionItem
            key={session.sessionId}
            session={session}
            isSelected={index === selectedIndex}
            homedir={homedir}
          />
        ))}
      </div>
    </div>
  )
}
