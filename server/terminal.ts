// 终端控制模块 — 通过 AppleScript 打开新终端窗口并 resume session
import { execFile } from 'child_process'
import { access } from 'fs/promises'
import { constants } from 'fs'

/** Resume 操作的返回结果 */
interface ResumeResult {
  success: boolean
  terminal: 'Terminal.app' | 'iTerm2'
}

/**
 * 检测用户是否安装了 iTerm2
 * 通过检查 /Applications/iTerm.app 是否存在来判断
 */
async function detectTerminalApp(): Promise<'Terminal.app' | 'iTerm2'> {
  try {
    await access('/Applications/iTerm.app', constants.F_OK)
    return 'iTerm2'
  } catch {
    return 'Terminal.app'
  }
}

/**
 * 对 AppleScript 字符串中的特殊字符进行转义
 * 双引号和反斜杠需要转义
 */
function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
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
    // 通过 stdin 传入 AppleScript，避免 shell 注入和转义问题
    child.stdin?.write(script)
    child.stdin?.end()
  })
}

/**
 * 在新终端窗口中 resume 一个 Claude session
 *
 * 1. 检测用户使用的终端应用（Terminal.app 或 iTerm2）
 * 2. 通过 AppleScript 打开新窗口
 * 3. 在新窗口中执行 cd + claude --resume 命令
 */
export async function resumeSession(sessionId: string, projectPath: string): Promise<ResumeResult> {
  const terminalApp = await detectTerminalApp()
  const escapedPath = escapeForAppleScript(projectPath)
  const command = `cd '${escapedPath}' && claude --resume ${sessionId}`
  const escapedCommand = escapeForAppleScript(command)

  if (terminalApp === 'iTerm2') {
    // iTerm2 AppleScript
    const script = [
      'tell application "iTerm2"',
      '  activate',
      '  create window with default profile',
      '  tell current session of current window',
      `    write text "${escapedCommand}"`,
      '  end tell',
      'end tell',
    ].join('\n')
    await runAppleScript(script)
  } else {
    // Terminal.app AppleScript
    const script = [
      'tell application "Terminal"',
      '  activate',
      `  do script "${escapedCommand}"`,
      'end tell',
    ].join('\n')
    await runAppleScript(script)
  }

  return {
    success: true,
    terminal: terminalApp,
  }
}
