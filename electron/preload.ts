// Electron preload 脚本 — 安全地暴露 IPC API 给 renderer
import { contextBridge, ipcRenderer } from 'electron'

/** 暴露给 renderer 的 API 类型 */
export interface ElectronAPI {
  // Session 数据
  sessions: {
    load: () => Promise<any>
    search: (query: string) => Promise<any>
    setName: (sessionId: string, name: string) => Promise<any>
  }

  // 终端管理
  terminal: {
    create: (sessionId: string, projectPath: string) => Promise<{ terminalId: string }>
    write: (terminalId: string, data: string) => Promise<void>
    resize: (terminalId: string, cols: number, rows: number) => Promise<void>
    close: (terminalId: string) => Promise<void>
    onData: (callback: (terminalId: string, data: string) => void) => () => void
    onExit: (callback: (terminalId: string, exitCode: number) => void) => () => void
  }

  // 右侧工具栏数据
  tools: {
    loadSkills: () => Promise<any[]>
    loadClaudeMd: (projectPath?: string) => Promise<any>
    saveClaudeMd: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
    listTasks: () => Promise<any[]>
    taskAction: (label: string, plistPath: string, action: 'start' | 'stop' | 'restart' | 'kickstart') => Promise<{ success: boolean; error?: string }>
    taskLog: (logPath: string, lines?: number) => Promise<{ success: boolean; content?: string; error?: string }>
    taskSetName: (label: string, name: string) => Promise<{ success: boolean }>
    taskDelete: (label: string, plistPath: string) => Promise<{ success: boolean; error?: string }>
  }
}

// 通过 contextBridge 安全暴露 API
contextBridge.exposeInMainWorld('electronAPI', {
  // Session 数据
  sessions: {
    load: () => ipcRenderer.invoke('sessions:load'),
    search: (query: string) => ipcRenderer.invoke('sessions:search', query),
    setName: (sessionId: string, name: string) =>
      ipcRenderer.invoke('sessions:set-name', sessionId, name),
  },

  // 终端管理
  terminal: {
    create: (sessionId: string, projectPath: string) =>
      ipcRenderer.invoke('terminal:create', sessionId, projectPath),
    write: (terminalId: string, data: string) =>
      ipcRenderer.invoke('terminal:write', terminalId, data),
    resize: (terminalId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
    close: (terminalId: string) =>
      ipcRenderer.invoke('terminal:close', terminalId),
    // 监听终端输出
    onData: (callback: (terminalId: string, data: string) => void) => {
      const handler = (_event: any, terminalId: string, data: string) => {
        callback(terminalId, data)
      }
      ipcRenderer.on('terminal:data', handler)
      // 返回取消监听的函数
      return () => {
        ipcRenderer.removeListener('terminal:data', handler)
      }
    },
    // 监听终端退出
    onExit: (callback: (terminalId: string, exitCode: number) => void) => {
      const handler = (_event: any, terminalId: string, exitCode: number) => {
        callback(terminalId, exitCode)
      }
      ipcRenderer.on('terminal:exit', handler)
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler)
      }
    },
  },

  // 右侧工具栏数据
  tools: {
    loadSkills: () => ipcRenderer.invoke('tools:load-skills'),
    loadClaudeMd: (projectPath?: string) =>
      ipcRenderer.invoke('tools:load-claudemd', projectPath),
    saveClaudeMd: (filePath: string, content: string) =>
      ipcRenderer.invoke('tools:save-claudemd', filePath, content),
    listTasks: () => ipcRenderer.invoke('tools:list-tasks'),
    taskAction: (label: string, plistPath: string, action: 'start' | 'stop' | 'restart' | 'kickstart') =>
      ipcRenderer.invoke('tools:task-action', label, plistPath, action),
    taskLog: (logPath: string, lines?: number) =>
      ipcRenderer.invoke('tools:task-log', logPath, lines),
    taskSetName: (label: string, name: string) =>
      ipcRenderer.invoke('tools:task-set-name', label, name),
    taskDelete: (label: string, plistPath: string) =>
      ipcRenderer.invoke('tools:task-delete', label, plistPath),
  },
} satisfies ElectronAPI)
