export type ToolTabId = 'skills' | 'shortcuts' | 'claudemd' | 'tasks' | 'notes'

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

export interface RemoteTrigger {
  id: string
  name: string
  cronExpression: string
  nextRunAt: string | null
  enabled: boolean
  endedReason: string
  createdAt: string
  updatedAt: string
  environmentId: string | null
  firstMessage: string
}

export interface RemoteTriggerListResult {
  success: boolean
  error?: string
  triggers?: RemoteTrigger[]
  authRequired?: boolean
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
