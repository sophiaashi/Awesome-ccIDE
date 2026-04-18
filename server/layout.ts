// 终端窗口布局管理模块 — 通过 AppleScript 控制窗口排列
import { execFile } from 'child_process'

/** 支持的布局类型 */
export type LayoutType = 'quad' | 'three-col' | 'two-col' | 'stack'

/** 布局 API 的返回结果 */
interface LayoutResult {
  success: boolean
  windowCount: number
  layout: LayoutType
}

/** 终端窗口信息 */
interface TerminalWindow {
  windowId: string
  title: string
  /** 从窗口标题/命令中提取的 sessionId（如果是 claude session） */
  sessionId?: string
  /** 关联的 session firstPrompt 摘要 */
  firstPrompt?: string
  /** 关联的 session summary */
  summary?: string
  /** 关联的项目名 */
  projectName?: string
  /** 关联的项目路径 */
  projectPath?: string
}

/** 终端状态返回结果 */
interface TerminalStatus {
  terminals: TerminalWindow[]
  terminalApp: 'Terminal.app' | 'iTerm2'
  /** 当前最前面的窗口 ID */
  frontmostWindowId?: string
}

/**
 * 执行 AppleScript 脚本
 * 通过 execFile + stdin 传递脚本内容，避免 shell 转义问题
 */
function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('osascript', ['-'], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
      } else {
        resolve(stdout.trim())
      }
    })
    child.stdin?.write(script)
    child.stdin?.end()
  })
}

/**
 * 获取屏幕可用区域大小
 * 返回 { width, height, x, y }（y 考虑菜单栏高度）
 */
async function getScreenBounds(): Promise<{ width: number; height: number; x: number; y: number }> {
  // 使用 python3 + AppKit 获取屏幕可用区域（排除菜单栏和 Dock）
  const script = `do shell script "python3 -c 'from AppKit import NSScreen; f=NSScreen.mainScreen().visibleFrame(); print(int(f.origin.x), int(f.origin.y), int(f.size.width), int(f.size.height))'"`
  const result = await runAppleScript(script)
  const parts = result.split(' ').map(Number)

  if (parts.length !== 4 || parts.some(isNaN)) {
    // 降级方案：使用固定值
    return { x: 0, y: 25, width: 1920, height: 1055 }
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  }
}

/**
 * 获取当前打开的终端窗口数量和信息
 */
async function getTerminalWindows(terminalApp: string): Promise<TerminalWindow[]> {
  const appName = terminalApp === 'iTerm2' ? 'iTerm2' : 'Terminal'

  const script = `
tell application "${appName}"
  set windowList to {}
  repeat with w in windows
    set wId to id of w
    set wName to name of w
    set end of windowList to (wId as text) & "|||" & wName
  end repeat
  set AppleScript's text item delimiters to "\\n"
  return windowList as text
end tell`

  try {
    const result = await runAppleScript(script)
    if (!result) return []

    return result.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|||')
      return {
        windowId: parts[0] || '',
        title: parts[1] || '',
      }
    })
  } catch {
    return []
  }
}

/**
 * 检测当前使用的终端应用
 */
async function detectTerminalApp(): Promise<'Terminal.app' | 'iTerm2'> {
  try {
    const { access } = await import('fs/promises')
    const { constants } = await import('fs')
    await access('/Applications/iTerm.app', constants.F_OK)
    return 'iTerm2'
  } catch {
    return 'Terminal.app'
  }
}

/**
 * 计算布局中每个窗口的位置和大小
 * 返回 { x, y, width, height }[] 数组
 */
function calculateLayout(
  layout: LayoutType,
  windowCount: number,
  screen: { width: number; height: number; x: number; y: number }
): Array<{ x: number; y: number; width: number; height: number }> {
  const bounds: Array<{ x: number; y: number; width: number; height: number }> = []

  // macOS 窗口坐标系：原点在左上角
  // visibleFrame 的 y 是从底部算的（Cocoa 坐标系），需要转换
  // AppleScript bounds 格式: {left, top, right, bottom}
  // 所以我们直接用屏幕像素坐标，菜单栏约 25px
  const menuBarHeight = 25
  const sx = screen.x
  const sy = menuBarHeight // 从菜单栏下方开始
  const sw = screen.width
  const sh = screen.height

  switch (layout) {
    case 'two-col': {
      // 双列布局：左右各占一半
      const colWidth = Math.floor(sw / 2)
      for (let i = 0; i < windowCount; i++) {
        const col = i % 2
        bounds.push({
          x: sx + col * colWidth,
          y: sy,
          width: colWidth,
          height: sh,
        })
      }
      break
    }

    case 'three-col': {
      // 三列布局：等分三列
      const colWidth = Math.floor(sw / 3)
      for (let i = 0; i < windowCount; i++) {
        const col = i % 3
        bounds.push({
          x: sx + col * colWidth,
          y: sy,
          width: colWidth,
          height: sh,
        })
      }
      break
    }

    case 'quad': {
      // 四宫格布局：2x2 网格
      const colWidth = Math.floor(sw / 2)
      const rowHeight = Math.floor(sh / 2)
      for (let i = 0; i < windowCount; i++) {
        const col = i % 2
        const row = Math.floor(i / 2) % 2
        bounds.push({
          x: sx + col * colWidth,
          y: sy + row * rowHeight,
          width: colWidth,
          height: rowHeight,
        })
      }
      break
    }

    case 'stack': {
      // 堆叠布局：所有窗口居中同等大小
      const stackWidth = Math.floor(sw * 0.8)
      const stackHeight = Math.floor(sh * 0.8)
      const stackX = sx + Math.floor((sw - stackWidth) / 2)
      const stackY = sy + Math.floor((sh - stackHeight) / 2)
      for (let i = 0; i < windowCount; i++) {
        bounds.push({
          x: stackX,
          y: stackY,
          width: stackWidth,
          height: stackHeight,
        })
      }
      break
    }
  }

  return bounds
}

/**
 * 应用布局到终端窗口
 * 用 AppleScript 批量设置每个窗口的位置和大小
 */
export async function applyLayout(layout: LayoutType): Promise<LayoutResult> {
  const terminalApp = await detectTerminalApp()
  const appName = terminalApp === 'iTerm2' ? 'iTerm2' : 'Terminal'

  // 获取当前终端窗口
  const windows = await getTerminalWindows(appName)

  if (windows.length === 0) {
    return {
      success: true,
      windowCount: 0,
      layout,
    }
  }

  // 获取屏幕尺寸
  const screen = await getScreenBounds()

  // 计算每个窗口的目标位置
  const positions = calculateLayout(layout, windows.length, screen)

  // 生成 AppleScript 批量设置窗口位置
  // AppleScript bounds 格式：{left, top, right, bottom}
  const setCommands = windows.map((w, i) => {
    const pos = positions[i]
    if (!pos) return ''
    const left = pos.x
    const top = pos.y
    const right = pos.x + pos.width
    const bottom = pos.y + pos.height
    return `    set bounds of window id ${w.windowId} to {${left}, ${top}, ${right}, ${bottom}}`
  }).filter(Boolean).join('\n')

  const script = `
tell application "${appName}"
  activate
${setCommands}
end tell`

  await runAppleScript(script)

  return {
    success: true,
    windowCount: windows.length,
    layout,
  }
}

/**
 * 从窗口标题中提取 claude session ID
 * 窗口标题可能包含 "claude --resume <sessionId>" 或类似格式
 */
function extractSessionId(title: string): string | undefined {
  // 匹配 claude --resume <uuid> 格式
  const resumeMatch = title.match(/claude\s+--resume\s+([0-9a-f-]{36})/i)
  if (resumeMatch) return resumeMatch[1]

  // 匹配窗口标题中的 UUID（claude session 的 UUID 格式）
  const uuidMatch = title.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (uuidMatch) return uuidMatch[1]

  return undefined
}

/**
 * 获取当前最前面的终端窗口 ID
 */
async function getFrontmostWindowId(appName: string): Promise<string | undefined> {
  const script = `
tell application "${appName}"
  try
    return id of front window as text
  on error
    return ""
  end try
end tell`

  try {
    const result = await runAppleScript(script)
    return result || undefined
  } catch {
    return undefined
  }
}

/**
 * 获取当前终端窗口状态
 * 尝试匹配每个窗口关联的 claude session
 */
export async function getTerminalStatus(): Promise<TerminalStatus> {
  const terminalApp = await detectTerminalApp()
  const appName = terminalApp === 'iTerm2' ? 'iTerm2' : 'Terminal'
  const windows = await getTerminalWindows(appName)
  const frontmostWindowId = await getFrontmostWindowId(appName)

  // 尝试从窗口标题中提取 sessionId
  for (const w of windows) {
    const sessionId = extractSessionId(w.title)
    if (sessionId) {
      w.sessionId = sessionId
    }
  }

  return {
    terminals: windows,
    terminalApp,
    frontmostWindowId,
  }
}

/**
 * 将指定终端窗口置顶显示
 * 支持通过 windowId 或 sessionId 定位窗口
 */
export async function focusWindow(options: { windowId?: string; sessionId?: string }): Promise<{ success: boolean }> {
  const terminalApp = await detectTerminalApp()
  const appName = terminalApp === 'iTerm2' ? 'iTerm2' : 'Terminal'

  let targetWindowId = options.windowId

  // 如果传的是 sessionId，先找到对应窗口
  if (!targetWindowId && options.sessionId) {
    const windows = await getTerminalWindows(appName)
    for (const w of windows) {
      const sid = extractSessionId(w.title)
      if (sid === options.sessionId) {
        targetWindowId = w.windowId
        break
      }
    }

    if (!targetWindowId) {
      throw new Error('未找到该 session 对应的终端窗口')
    }
  }

  if (!targetWindowId) {
    throw new Error('缺少 windowId 或 sessionId')
  }

  // AppleScript 将窗口置顶
  const script = `
tell application "${appName}"
  activate
  set index of window id ${targetWindowId} to 1
end tell`

  await runAppleScript(script)

  return { success: true }
}
