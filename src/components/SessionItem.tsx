// 单个 Session 行组件
import type { Session } from '../types/session'
import { formatRelativeTime } from '../utils/time'
import { getProjectColor } from '../utils/color'

interface SessionItemProps {
  session: Session
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
 */
function shortenPath(fullPath: string): string {
  if (!fullPath || fullPath === '/') return '/'
  const home = '/Users/sophia'
  if (fullPath.startsWith(home)) {
    return '~' + fullPath.slice(home.length)
  }
  return fullPath
}

export function SessionItem({ session }: SessionItemProps) {
  const projectColor = getProjectColor(session.projectName)
  const relativeTime = formatRelativeTime(session.modified)

  return (
    <div
      className="group flex items-stretch border-b transition-colors duration-150 cursor-pointer"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* 左侧项目颜色竖条 */}
      <div
        className="w-1 shrink-0 rounded-l"
        style={{ backgroundColor: projectColor }}
      />

      {/* 主体内容 */}
      <div className="flex-1 min-w-0 py-3 px-4">
        {/* 第一行：firstPrompt + 时间 */}
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-sm font-medium truncate flex-1"
            style={{ color: 'var(--text-primary)' }}
            title={session.firstPrompt}
          >
            {truncateText(session.firstPrompt, 100)}
          </p>
          <span
            className="text-xs whitespace-nowrap shrink-0 mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {relativeTime}
          </span>
        </div>

        {/* 第二行：summary（若有）*/}
        {session.summary && (
          <p
            className="text-xs mt-1 truncate"
            style={{ color: 'var(--text-secondary)' }}
            title={session.summary}
          >
            {truncateText(session.summary, 120)}
          </p>
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
            {shortenPath(session.projectPath)}
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
