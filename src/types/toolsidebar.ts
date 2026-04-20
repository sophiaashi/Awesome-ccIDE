export type ToolTabId = 'skills' | 'shortcuts' | 'claudemd'

export interface SkillInfo {
  name: string
  description: string
  type?: string
  source: 'user' | 'plugin'
  sourceLabel: string
  filePath: string
}

export interface ClaudeMdBundle {
  user: { path: string; content: string | null }
  project: { path: string; content: string | null } | null
}
