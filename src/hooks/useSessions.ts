// Session 数据获取 hook
import { useState, useEffect } from 'react'
import type { Session, SessionsResponse } from '../types/session'

interface UseSessionsReturn {
  sessions: Session[]
  totalCount: number
  projects: string[]
  loading: boolean
  error: string | null
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [projects, setProjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true)
        const res = await fetch('/api/sessions')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: SessionsResponse = await res.json()
        setSessions(data.sessions)
        setTotalCount(data.totalCount)
        setProjects(data.projects)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  return { sessions, totalCount, projects, loading, error }
}
