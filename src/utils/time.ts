// 时间格式化工具

/**
 * 将 ISO 时间字符串转为相对时间描述
 * 例如："2分钟前"、"3小时前"、"5天前"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSeconds < 60) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  if (diffWeeks < 4) return `${diffWeeks}周前`
  if (diffMonths < 12) return `${diffMonths}个月前`
  return `${Math.floor(diffMonths / 12)}年前`
}
