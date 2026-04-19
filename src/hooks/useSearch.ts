// 搜索与过滤逻辑 hook — 支持全文搜索
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { Session, SortMode, SearchMatch } from '../types/session'

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
  /** 全文搜索匹配结果 (sessionId → 匹配片段) */
  searchMatches: Record<string, SearchMatch[]>
  /** 是否正在搜索 */
  isSearching: boolean
}

/**
 * 搜索过滤 hook
 * 先搜 firstPrompt + summary，同时调后端全文搜索 API 搜历史记录
 */
export function useSearch(sessions: Session[]): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('modified')
  const [searchMatches, setSearchMatches] = useState<Record<string, SearchMatch[]>>({})
  const [isSearching, setIsSearching] = useState(false)

  // 防抖计时器
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 全文搜索（调后端 API，带防抖）
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchMatches({})
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchMatches(data.results || {})
        }
      } catch {
        // 搜索 API 失败不影响本地搜索
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const filteredSessions = useMemo(() => {
    let result = sessions

    // 1. 按项目过滤
    if (filterProject) {
      result = result.filter(s => s.projectName === filterProject)
    }

    // 2. 按关键词搜索（本地搜 firstPrompt + summary + 全文搜索结果合并）
    if (query.trim()) {
      const lowerQuery = query.trim().toLowerCase()
      result = result.filter(s => {
        // 本地匹配 firstPrompt 和 summary
        const promptMatch = s.firstPrompt?.toLowerCase().includes(lowerQuery)
        const summaryMatch = s.summary?.toLowerCase().includes(lowerQuery)
        // 全文搜索匹配（来自后端 API）
        const fullTextMatch = s.sessionId in searchMatches
        return promptMatch || summaryMatch || fullTextMatch
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
  }, [sessions, query, filterProject, sortMode, searchMatches])

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
    searchMatches,
    isSearching,
  }
}
