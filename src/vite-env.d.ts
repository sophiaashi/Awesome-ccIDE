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
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
