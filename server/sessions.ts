// Session 数据读取模块
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
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

// ========== Session 自定义名称管理 ==========

const NAMES_FILE = path.join(os.homedir(), '.claude-session-manager', 'session-names.json')

/** 读取所有自定义名称 */
export function loadSessionNames(): Record<string, string> {
  try {
    if (existsSync(NAMES_FILE)) {
      return JSON.parse(readFileSync(NAMES_FILE, 'utf-8'))
    }
  } catch {}
  return {}
}

/** 保存自定义名称 */
function saveSessionNames(names: Record<string, string>): void {
  const dir = path.dirname(NAMES_FILE)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(NAMES_FILE, JSON.stringify(names, null, 2), 'utf-8')
}

/** 设置 session 名称 */
export function setSessionName(sessionId: string, name: string): void {
  const names = loadSessionNames()
  if (name.trim()) {
    names[sessionId] = name.trim()
  } else {
    delete names[sessionId]
  }
  saveSessionNames(names)
}

/** 删除 session 名称 */
export function deleteSessionName(sessionId: string): void {
  const names = loadSessionNames()
  delete names[sessionId]
  saveSessionNames(names)
}

// ========== Session 数据 ==========

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
  /** 用户自定义名称 */
  customName?: string
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

  // 补充未被 index 收录的活跃 session（扫描 .jsonl 文件）
  const indexedIds = new Set(allSessions.map(s => s.sessionId))
  const projectDirs = await glob(path.join(homeDir, '.claude', 'projects', '*'))
  for (const projDir of projectDirs) {
    try {
      const jsonlFiles = await glob(path.join(projDir, '*.jsonl'))
      for (const jsonlPath of jsonlFiles) {
        const sessionId = path.basename(jsonlPath, '.jsonl')
        // 跳过已索引的和非 UUID 格式的
        if (indexedIds.has(sessionId) || !/^[0-9a-f]{8}-/.test(sessionId)) continue

        try {
          const stat = require('fs').statSync(jsonlPath)
          // 从 jsonl 第一行提取信息
          const firstLines = readFileSync(jsonlPath, 'utf-8').split('\n').slice(0, 20)
          let firstPrompt = ''
          let projectPath = homeDir
          let cwd = ''
          let created = new Date(stat.birthtimeMs).toISOString()

          for (const line of firstLines) {
            if (!line.trim()) continue
            try {
              const entry = JSON.parse(line)
              if (entry.type === 'user' && entry.message?.content && !firstPrompt) {
                const content = entry.message.content
                firstPrompt = typeof content === 'string' ? content.slice(0, 200) : ''
              }
              if (entry.cwd && !cwd) cwd = entry.cwd
              if (entry.timestamp && !created) created = entry.timestamp
            } catch {}
          }

          projectPath = cwd || homeDir
          const projectName = extractProjectName(projectPath)
          projectSet.add(projectName)

          allSessions.push({
            sessionId,
            fullPath: jsonlPath,
            fileMtime: stat.mtimeMs,
            firstPrompt: firstPrompt || `(session ${sessionId.slice(0, 8)})`,
            messageCount: 0,
            created,
            modified: new Date(stat.mtimeMs).toISOString(),
            gitBranch: '',
            projectPath,
            projectName,
            isSidechain: false,
          })
        } catch {}
      }
    } catch {}
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

  // 合并自定义名称
  const customNames = loadSessionNames()
  for (const session of uniqueSessions) {
    if (customNames[session.sessionId]) {
      session.customName = customNames[session.sessionId]
    }
  }

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

/** 搜索结果中匹配的文本片段 */
export interface SearchMatch {
  text: string        // 包含关键词的那句话
  highlight: string   // 高亮位置的上下文片段
}

/** 搜索结果 */
export interface SearchResult {
  sessionId: string
  matches: SearchMatch[]  // 匹配到的文本片段（最多3条）
}

/**
 * 从 history.jsonl 构建搜索索引
 * history.jsonl 每行格式: { display: "用户输入", sessionId: "uuid", timestamp: number, ... }
 * 轻量高效：568K，2000+ 行
 */
let historyIndex: { display: string; sessionId: string }[] | null = null

async function loadHistoryIndex(): Promise<{ display: string; sessionId: string }[]> {
  if (historyIndex) return historyIndex

  const historyPath = path.join(os.homedir(), '.claude', 'history.jsonl')
  if (!existsSync(historyPath)) {
    historyIndex = []
    return historyIndex
  }

  const entries: { display: string; sessionId: string }[] = []

  const fileStream = createReadStream(historyPath, 'utf-8')
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity })

  for await (const line of rl) {
    try {
      const data = JSON.parse(line)
      if (data.display && data.sessionId) {
        entries.push({
          display: data.display,
          sessionId: data.sessionId,
        })
      }
    } catch {
      // 跳过解析失败的行
    }
  }

  historyIndex = entries
  return historyIndex
}

/**
 * 全文搜索：在 history.jsonl 的所有用户输入中搜索关键词
 * 返回匹配的 sessionId 及包含关键词的文本片段
 */
export async function fullTextSearch(
  query: string
): Promise<Map<string, SearchMatch[]>> {
  const lowerQuery = query.toLowerCase()
  const index = await loadHistoryIndex()
  const resultMap = new Map<string, SearchMatch[]>()

  for (const entry of index) {
    const lowerDisplay = entry.display.toLowerCase()
    if (lowerDisplay.includes(lowerQuery)) {
      // 提取包含关键词的上下文片段（前后各50字符）
      const pos = lowerDisplay.indexOf(lowerQuery)
      const start = Math.max(0, pos - 40)
      const end = Math.min(entry.display.length, pos + query.length + 40)
      const snippet = (start > 0 ? '...' : '') +
        entry.display.slice(start, end) +
        (end < entry.display.length ? '...' : '')

      const match: SearchMatch = {
        text: entry.display.length > 120
          ? entry.display.slice(0, 120) + '...'
          : entry.display,
        highlight: snippet,
      }

      const existing = resultMap.get(entry.sessionId) || []
      if (existing.length < 3) {  // 每个 session 最多保留 3 条匹配
        existing.push(match)
        resultMap.set(entry.sessionId, existing)
      }
    }
  }

  return resultMap
}

/**
 * 使搜索索引失效（用于数据更新时）
 */
export function invalidateSearchIndex(): void {
  historyIndex = null
}
