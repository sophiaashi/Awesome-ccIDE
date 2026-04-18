// 搜索与过滤逻辑 hook
import { useState, useMemo, useCallback } from 'react'
import type { Session, SortMode } from '../types/session'

interface UseSearchReturn {
  /** 搜索关键词 */
  query: string
  /** 更新搜索关键词 */
  setQuery: (q: string) => void
  /** 当前选中的项目过滤 */
  filterProject: string
  /** 更新项目过滤 */
  setFilterProject: (p: string) => void
  /** 当前排序方式 */
  sortMode: SortMode
  /** 更新排序方式 */
  setSortMode: (m: SortMode) => void
  /** 过滤后的 session 列表 */
  filteredSessions: Session[]
  /** 过滤后的数量 */
  filteredCount: number
}

/**
 * 搜索过滤 hook
 * 搜索 firstPrompt + summary 字段，支持中英文
 */
export function useSearch(sessions: Session[]): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [filterProject, setFilterProject] = useState('') // 空字符串表示"全部"
  const [sortMode, setSortMode] = useState<SortMode>('modified')

  const filteredSessions = useMemo(() => {
    let result = sessions

    // 1. 按项目过滤
    if (filterProject) {
      result = result.filter(s => s.projectName === filterProject)
    }

    // 2. 按关键词搜索（搜索 firstPrompt + summary）
    if (query.trim()) {
      const lowerQuery = query.trim().toLowerCase()
      result = result.filter(s => {
        const promptMatch = s.firstPrompt?.toLowerCase().includes(lowerQuery)
        const summaryMatch = s.summary?.toLowerCase().includes(lowerQuery)
        return promptMatch || summaryMatch
      })
    }

    // 3. 排序
    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case 'modified':
          return new Date(b.modified).getTime() - new Date(a.modified).getTime()
        case 'created':
          return new Date(b.created).getTime() - new Date(a.created).getTime()
        case 'messageCount':
          return b.messageCount - a.messageCount
        default:
          return 0
      }
    })

    return result
  }, [sessions, query, filterProject, sortMode])

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q)
  }, [])

  return {
    query,
    setQuery: handleSetQuery,
    filterProject,
    setFilterProject,
    sortMode,
    setSortMode,
    filteredSessions,
    filteredCount: filteredSessions.length,
  }
}
