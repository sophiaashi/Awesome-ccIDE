export type ToolTabId = 'skills' | 'shortcuts' | 'claudemd' | 'tasks'

export interface BackgroundTask {
  label: string
  customName?: string
  plistPath: string
  type: 'daemon' | 'scheduled' | 'on-demand' | 'on-login' | 'unknown'
  scheduleDesc?: string
  programArguments?: string[]
  stdOutPath?: string
  stdErrPath?: string
  runAtLoad?: boolean
  keepAlive?: boolean
  pid: number | null
  lastExitStatus?: number
  loaded: boolean
}

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
