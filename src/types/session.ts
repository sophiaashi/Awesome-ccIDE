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
  /** 用户自定义名称 */
  customName?: string
}

/** sessions:load IPC 的响应 */
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

/** 全文搜索响应 */
export interface SearchResponse {
  results: Record<string, SearchMatch[]>
}

/** 布局类型 */
export type LayoutType = 'two-col' | 'three-col' | 'quad' | 'stack'

/** 终端实例信息（在 renderer 中管理） */
export interface TerminalInfo {
  /** 终端唯一 ID（由 main process 返回） */
  terminalId: string
  /** 关联的 session ID */
  sessionId: string
  /** 项目路径 */
  projectPath: string
  /** 项目名称 */
  projectName?: string
  /** session 的 firstPrompt */
  firstPrompt?: string
  /** session 的自定义名称 */
  customName?: string
}
