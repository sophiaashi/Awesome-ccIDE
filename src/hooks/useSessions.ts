// Session 数据获取 — 优先 Electron IPC，fallback 到 HTTP API
import { useState, useEffect, useCallback } from 'react'
import type { Session, SessionsResponse } from '../types/session'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

interface UseSessionsReturn {
  sessions: Session[]
  totalCount: number
  projects: string[]
  homedir: string
  loading: boolean
  error: string | null
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

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    async function fetch_() {
      try {
        if (refreshKey === 0) setLoading(true)
        let data: SessionsResponse
        if (isElectron) {
          data = await window.electronAPI.sessions.load()
        } else {
          const res = await fetch('/api/sessions')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          data = await res.json()
        }
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
    fetch_()
  }, [refreshKey])

  return { sessions, totalCount, projects, homedir, loading, error, refresh }
}
