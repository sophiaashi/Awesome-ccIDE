// Electron 主进程 — 管理窗口、IPC 通信和 node-pty 终端实例
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import * as pty from 'node-pty'
import { loadAllSessions, fullTextSearch, setSessionName, deleteSessionName } from '../server/sessions'

// ========== 类型定义 ==========

/** pty 终端实例信息 */
interface PtyInstance {
  pty: pty.IPty
  sessionId: string
  projectPath: string
}

// ========== 全局状态 ==========

/** 主窗口引用 */
let mainWindow: BrowserWindow | null = null

/** 活跃的 pty 实例映射 (terminalId → PtyInstance) */
const ptyInstances = new Map<string, PtyInstance>()

/** 终端 ID 计数器 */
let terminalIdCounter = 0

// ========== 窗口创建 ==========

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'ccIDE',
    titleBarStyle: 'hiddenInset', // macOS 原生标题栏样式
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // node-pty 需要 sandbox 关闭
    },
  })

  // 开发模式加载 Vite dev server，生产模式加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // __dirname 是 dist-electron/electron/，所以需要上两级到项目根再进 dist
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ========== IPC Handlers: Session 数据 ==========

/** 加载所有 session 数据 */
ipcMain.handle('sessions:load', async () => {
  return await loadAllSessions()
})

/** 全文搜索 */
ipcMain.handle('sessions:search', async (_event, query: string) => {
  if (!query.trim()) return { results: {} }
  const matchMap = await fullTextSearch(query)
  // Map 转 plain object 用于序列化
  const results: Record<string, { text: string; highlight: string }[]> = {}
  for (const [sessionId, matches] of matchMap) {
    results[sessionId] = matches
  }
  return { results }
})

/** 设置 session 自定义名称 */
ipcMain.handle('sessions:set-name', async (_event, sessionId: string, name: string) => {
  if (name.trim()) {
    setSessionName(sessionId, name)
  } else {
    deleteSessionName(sessionId)
  }
  return { success: true, name: name.trim() || null }
})

// ========== IPC Handlers: 终端管理 ==========

/** 创建新的 pty 终端实例 */
ipcMain.handle('terminal:create', async (_event, sessionId: string, projectPath: string) => {
  const terminalId = `terminal-${++terminalIdCounter}`

  // 确定 shell 路径
  const shell = process.env.SHELL || '/bin/zsh'

  // 构建完整的 PATH（Electron 打包后 shell 可能缺少用户 PATH）
  const userPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    `${os.homedir()}/.nvm/versions/node/current/bin`,
    `${os.homedir()}/.bun/bin`,
    `${os.homedir()}/.cargo/bin`,
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
  const fullPath = [...new Set([...userPaths, ...(process.env.PATH?.split(':') || [])])].join(':')

  // 创建 pty 实例（interactive shell，不用 login 避免触发 .zprofile 权限检查）
  const ptyProcess = pty.spawn(shell, ['-i'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: projectPath || os.homedir(),
    env: {
      ...process.env,
      PATH: fullPath,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    } as Record<string, string>,
  })

  // 保存 pty 实例
  ptyInstances.set(terminalId, {
    pty: ptyProcess,
    sessionId,
    projectPath,
  })

  // 监听 pty 输出，转发到 renderer
  ptyProcess.onData((data: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', terminalId, data)
    }
  })

  // 监听 pty 退出
  ptyProcess.onExit(({ exitCode }) => {
    ptyInstances.delete(terminalId)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', terminalId, exitCode)
    }
  })

  // 先等 shell 初始化，然后发送 claude 命令
  // sessionId 为空 → 新建 session，否则 resume 指定 session
  setTimeout(() => {
    const cmd = sessionId ? `claude --resume ${sessionId}\r` : `claude\r`
    ptyProcess.write(cmd)
  }, 300)

  return { terminalId }
})

/** 向 pty 写入数据（用户键盘输入） */
ipcMain.handle('terminal:write', async (_event, terminalId: string, data: string) => {
  const instance = ptyInstances.get(terminalId)
  if (instance) {
    instance.pty.write(data)
  }
})

/** 调整 pty 终端大小 */
ipcMain.handle('terminal:resize', async (_event, terminalId: string, cols: number, rows: number) => {
  const instance = ptyInstances.get(terminalId)
  if (instance) {
    try {
      instance.pty.resize(cols, rows)
    } catch {
      // resize 可能在 pty 已关闭时失败，忽略
    }
  }
})

/** 关闭 pty 终端 */
ipcMain.handle('terminal:close', async (_event, terminalId: string) => {
  const instance = ptyInstances.get(terminalId)
  if (instance) {
    instance.pty.kill()
    ptyInstances.delete(terminalId)
  }
})

// ========== 应用生命周期 ==========

app.whenReady().then(() => {
  createWindow()

  // macOS: 点击 dock 图标时如果没有窗口则创建一个
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  // 关闭所有 pty 实例
  for (const [id, instance] of ptyInstances) {
    try {
      instance.pty.kill()
    } catch {}
    ptyInstances.delete(id)
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // 确保所有 pty 在退出前被清理
  for (const [id, instance] of ptyInstances) {
    try {
      instance.pty.kill()
    } catch {}
    ptyInstances.delete(id)
  }
})
