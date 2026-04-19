// Session 数据获取 hook — 通过 Electron IPC 读取
import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../types/session'

interface UseSessionsReturn {
  sessions: Session[]
  totalCount: number
  projects: string[]
  homedir: string
  loading: boolean
  error: string | null
  /** 重新加载数据（用于名称更新后刷新） */
  refresh: () => void
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [projects, setProjects] = useState<string[]>([])
  const [homedir, setHomedir] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    async function fetchSessions() {
      try {
        if (refreshKey === 0) setLoading(true)
        // 通过 Electron IPC 调用 main process 加载数据
        const data = await window.electronAPI.sessions.load()
        setSessions(data.sessions)
        setTotalCount(data.totalCount)
        setProjects(data.projects)
        setHomedir(data.homedir)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [refreshKey])

  return { sessions, totalCount, projects, homedir, loading, error, refresh }
}
