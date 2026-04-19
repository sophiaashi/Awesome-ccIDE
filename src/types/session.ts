// Session 数据类型定义

/** sessions-index.json 中的原始 entry */
export interface SessionEntry {
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

/** API 返回的 session 数据（包含派生字段） */
export interface Session extends SessionEntry {
  projectName: string
}

/** GET /api/sessions 的响应 */
export interface SessionsResponse {
  sessions: Session[]
  totalCount: number
  projects: string[]
  homedir: string
}

/** 排序方式 */
export type SortMode = 'modified' | 'created' | 'messageCount'

/** 搜索匹配的文本片段 */
export interface SearchMatch {
  text: string
  highlight: string
}

/** 全文搜索 API 响应 */
export interface SearchResponse {
  results: Record<string, SearchMatch[]>
}
