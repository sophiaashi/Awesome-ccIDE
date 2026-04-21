/// <reference types="vite/client" />

// Electron preload 注入的 API 类型声明
interface ElectronAPI {
  sessions: {
    load: () => Promise<import('./types/session').SessionsResponse>
    search: (query: string) => Promise<import('./types/session').SearchResponse>
    setName: (sessionId: string, name: string) => Promise<{ success: boolean; name: string | null }>
  }
  terminal: {
    create: (sessionId: string, projectPath: string) => Promise<{ terminalId: string }>
    write: (terminalId: string, data: string) => Promise<void>
    resize: (terminalId: string, cols: number, rows: number) => Promise<void>
    close: (terminalId: string) => Promise<void>
    onData: (callback: (terminalId: string, data: string) => void) => () => void
    onExit: (callback: (terminalId: string, exitCode: number) => void) => () => void
  }
  tools: {
    loadSkills: () => Promise<import('./types/toolsidebar').SkillInfo[]>
    loadClaudeMd: (projectPath?: string) => Promise<import('./types/toolsidebar').ClaudeMdBundle>
    saveClaudeMd: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
    listTasks: () => Promise<import('./types/toolsidebar').BackgroundTask[]>
    taskAction: (label: string, plistPath: string, action: 'start' | 'stop' | 'restart' | 'kickstart') => Promise<{ success: boolean; error?: string }>
    taskLog: (logPath: string, lines?: number) => Promise<{ success: boolean; content?: string; error?: string }>
    taskSetName: (label: string, name: string) => Promise<{ success: boolean }>
    taskDelete: (label: string, plistPath: string) => Promise<{ success: boolean; error?: string }>
    loadNotes: () => Promise<{ content: string; path: string }>
    saveNotes: (content: string) => Promise<{ success: boolean; error?: string }>
    listRemoteTriggers: () => Promise<import('./types/toolsidebar').RemoteTriggerListResult>
    remoteTriggerToggle: (id: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
    remoteTriggerDelete: (id: string) => Promise<{ success: boolean; error?: string }>
  }
  hooks: {
    check: () => Promise<{ stopInstalled: boolean; notifyInstalled: boolean }>
    install: () => Promise<{ success: boolean; backup?: string; error?: string }>
    onNotify: (cb: (ev: { event: 'stop' | 'notify'; sessionId: string; cwd?: string }) => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
