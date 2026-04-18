// Session 数据读取模块
import { readFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'
import os from 'os'

interface RawEntry {
  sessionId: string
  fullPath: string
  fileMtime: number
  firstPrompt: string
  summary?: string
  messageCount: number
  created: string
  modified: string
  gitBranch: string
  projectPath: string
  isSidechain: boolean
}

interface SessionIndexFile {
  version: number
  entries: RawEntry[]
  originalPath: string
}

export interface SessionData {
  sessionId: string
  fullPath: string
  fileMtime: number
  firstPrompt: string
  summary?: string
  messageCount: number
  created: string
  modified: string
  gitBranch: string
  projectPath: string
  projectName: string
  isSidechain: boolean
}

/**
 * 从项目路径中提取项目名称
 * 例如："/Users/sophia/teamoclaw" → "teamoclaw"
 *       "/" → "root"
 */
function extractProjectName(projectPath: string): string {
  if (!projectPath || projectPath === '/') return 'root'
  return path.basename(projectPath)
}

/**
 * 读取所有 sessions-index.json 文件并合并
 */
export async function loadAllSessions(): Promise<{
  sessions: SessionData[]
  totalCount: number
  projects: string[]
  homedir: string
}> {
  const homeDir = os.homedir()
  const pattern = path.join(homeDir, '.claude', 'projects', '*', 'sessions-index.json')

  // 查找所有 sessions-index.json 文件
  const files = await glob(pattern)

  const allSessions: SessionData[] = []
  const projectSet = new Set<string>()

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const indexData: SessionIndexFile = JSON.parse(content)

      if (!indexData.entries || !Array.isArray(indexData.entries)) continue

      for (const entry of indexData.entries) {
        const projectName = extractProjectName(entry.projectPath)
        projectSet.add(projectName)

        allSessions.push({
          sessionId: entry.sessionId,
          fullPath: entry.fullPath,
          fileMtime: entry.fileMtime,
          firstPrompt: entry.firstPrompt || '',
          summary: entry.summary,
          messageCount: entry.messageCount || 0,
          created: entry.created,
          modified: entry.modified,
          gitBranch: entry.gitBranch || '',
          projectPath: entry.projectPath || '',
          projectName,
          isSidechain: entry.isSidechain || false,
        })
      }
    } catch (err) {
      // 跳过无法读取的文件，不崩溃
      console.error(`读取失败: ${filePath}`, err)
    }
  }

  // 去重：同一个 sessionId 可能出现在多个 index 文件中，保留最新的
  const sessionMap = new Map<string, SessionData>()
  for (const session of allSessions) {
    const existing = sessionMap.get(session.sessionId)
    if (!existing || new Date(session.modified).getTime() > new Date(existing.modified).getTime()) {
      sessionMap.set(session.sessionId, session)
    }
  }
  const uniqueSessions = Array.from(sessionMap.values())

  // 按 modified 时间倒序排列（最新的在最上面）
  uniqueSessions.sort((a, b) => {
    const timeA = new Date(a.modified).getTime()
    const timeB = new Date(b.modified).getTime()
    return timeB - timeA
  })

  const projects = Array.from(projectSet).sort()

  return {
    sessions: uniqueSessions,
    totalCount: uniqueSessions.length,
    projects,
    homedir: homeDir,
  }
}
