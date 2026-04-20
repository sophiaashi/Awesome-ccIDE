// 扫描 ~/Library/LaunchAgents/ 下用户自定义的 launchd 任务
// 过滤掉 com.apple.* / com.google.* / application.* 等非用户自装的
// 返回每个任务的元数据 + 实时运行状态
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'
import os from 'os'

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
  // 运行时
  pid: number | null
  lastExitStatus?: number
  loaded: boolean  // 是否已 bootstrap 到 launchd
}

// ========== 自定义名称存储 ==========

const NAMES_FILE = path.join(os.homedir(), '.claude-session-manager', 'task-names.json')

function loadTaskNames(): Record<string, string> {
  try {
    if (existsSync(NAMES_FILE)) {
      return JSON.parse(readFileSync(NAMES_FILE, 'utf-8'))
    }
  } catch {}
  return {}
}

function saveTaskNames(names: Record<string, string>) {
  const dir = path.dirname(NAMES_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(NAMES_FILE, JSON.stringify(names, null, 2), 'utf-8')
}

export function setTaskName(label: string, name: string): void {
  const names = loadTaskNames()
  const trimmed = name.trim()
  if (trimmed) {
    names[label] = trimmed
  } else {
    delete names[label]
  }
  saveTaskNames(names)
}

// ========== 过滤规则：只显示用户自装的 ==========

function isUserTask(label: string): boolean {
  const prefixes = [
    'com.apple.',
    'com.google.',
    'com.microsoft.',
    'com.tencent.',
    'com.netease.',
    'application.',
    'com.adobe.',
    'org.macports.',
  ]
  return !prefixes.some(p => label.startsWith(p))
}

// ========== plist 解析（用 plutil 转 JSON） ==========

function parsePlist(plistPath: string): any {
  try {
    const result = spawnSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath], {
      encoding: 'utf-8',
      timeout: 3000,
    })
    if (result.status !== 0) return null
    return JSON.parse(result.stdout)
  } catch {
    return null
  }
}

function inferTaskType(plist: any): {
  type: BackgroundTask['type']
  scheduleDesc?: string
} {
  if (plist.StartInterval) {
    return { type: 'scheduled', scheduleDesc: formatInterval(plist.StartInterval) }
  }
  if (plist.StartCalendarInterval) {
    return { type: 'scheduled', scheduleDesc: formatCalendar(plist.StartCalendarInterval) }
  }
  if (plist.KeepAlive) {
    return { type: 'daemon', scheduleDesc: '常驻运行' }
  }
  if (plist.RunAtLoad) {
    return { type: 'on-login', scheduleDesc: '登录时启动' }
  }
  return { type: 'on-demand', scheduleDesc: '按需启动' }
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `每 ${seconds} 秒`
  if (seconds < 3600) return `每 ${Math.round(seconds / 60)} 分钟`
  if (seconds < 86400) return `每 ${(seconds / 3600).toFixed(1)} 小时`
  return `每 ${Math.round(seconds / 86400)} 天`
}

function formatCalendar(cal: any | any[]): string {
  // cal 可能是单个对象或数组
  const items = Array.isArray(cal) ? cal : [cal]
  return items.map(c => {
    const parts: string[] = []
    if (c.Weekday !== undefined) parts.push(`周${['日','一','二','三','四','五','六'][c.Weekday] || c.Weekday}`)
    if (c.Month !== undefined) parts.push(`${c.Month}月`)
    if (c.Day !== undefined) parts.push(`${c.Day}日`)
    const h = c.Hour !== undefined ? String(c.Hour).padStart(2, '0') : '*'
    const m = c.Minute !== undefined ? String(c.Minute).padStart(2, '0') : '*'
    parts.push(`${h}:${m}`)
    return parts.join(' ')
  }).join(' / ')
}

// ========== launchctl 查询状态 ==========

function getLaunchctlStatus(label: string): { pid: number | null; lastExitStatus?: number; loaded: boolean } {
  const uid = process.getuid?.() ?? 501
  // 先用 list（老接口，输出可靠）
  const result = spawnSync('/bin/launchctl', ['list', label], {
    encoding: 'utf-8',
    timeout: 3000,
  })
  if (result.status !== 0) {
    // 未 load
    return { pid: null, loaded: false }
  }
  const out = result.stdout
  const pidMatch = out.match(/"PID"\s*=\s*(\d+)/)
  const lastExitMatch = out.match(/"LastExitStatus"\s*=\s*(-?\d+)/)
  return {
    pid: pidMatch ? parseInt(pidMatch[1], 10) : null,
    lastExitStatus: lastExitMatch ? parseInt(lastExitMatch[1], 10) : undefined,
    loaded: true,
  }
}

// ========== 主扫描 ==========

export async function listBackgroundTasks(): Promise<BackgroundTask[]> {
  const homeDir = os.homedir()
  const agentDir = path.join(homeDir, 'Library', 'LaunchAgents')
  if (!existsSync(agentDir)) return []

  const files = readdirSync(agentDir).filter(f => f.endsWith('.plist'))
  const customNames = loadTaskNames()
  const tasks: BackgroundTask[] = []

  for (const file of files) {
    const plistPath = path.join(agentDir, file)
    const plist = parsePlist(plistPath)
    if (!plist || !plist.Label) continue
    const label = plist.Label
    if (!isUserTask(label)) continue

    const { type, scheduleDesc } = inferTaskType(plist)
    const status = getLaunchctlStatus(label)

    tasks.push({
      label,
      customName: customNames[label],
      plistPath,
      type,
      scheduleDesc,
      programArguments: plist.ProgramArguments || (plist.Program ? [plist.Program] : undefined),
      stdOutPath: plist.StandardOutPath ? expandTilde(plist.StandardOutPath) : undefined,
      stdErrPath: plist.StandardErrorPath ? expandTilde(plist.StandardErrorPath) : undefined,
      runAtLoad: !!plist.RunAtLoad,
      keepAlive: !!plist.KeepAlive,
      pid: status.pid,
      lastExitStatus: status.lastExitStatus,
      loaded: status.loaded,
    })
  }

  // 运行中的在前
  tasks.sort((a, b) => {
    if ((a.pid !== null) !== (b.pid !== null)) return a.pid !== null ? -1 : 1
    return a.label.localeCompare(b.label)
  })

  return tasks
}

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

// ========== 操作：启动 / 停止 / 重启 / 立即跑一次 ==========

export interface ActionResult {
  success: boolean
  error?: string
}

export async function performTaskAction(
  label: string,
  plistPath: string,
  action: 'start' | 'stop' | 'restart' | 'kickstart',
): Promise<ActionResult> {
  const uid = process.getuid?.() ?? 501
  const domainTarget = `gui/${uid}`
  const serviceTarget = `gui/${uid}/${label}`

  try {
    switch (action) {
      case 'start': {
        // 先 bootstrap（如未 load 过），再 enable + kickstart
        const boot = spawnSync('/bin/launchctl', ['bootstrap', domainTarget, plistPath], { encoding: 'utf-8', timeout: 5000 })
        // bootstrap 可能因为已 loaded 而失败，不影响后续
        spawnSync('/bin/launchctl', ['enable', serviceTarget], { encoding: 'utf-8', timeout: 5000 })
        const kick = spawnSync('/bin/launchctl', ['kickstart', serviceTarget], { encoding: 'utf-8', timeout: 5000 })
        if (kick.status !== 0 && boot.status !== 0) {
          return { success: false, error: (kick.stderr || boot.stderr || '启动失败').trim() }
        }
        return { success: true }
      }
      case 'stop': {
        const r = spawnSync('/bin/launchctl', ['bootout', serviceTarget], { encoding: 'utf-8', timeout: 5000 })
        if (r.status !== 0) return { success: false, error: r.stderr.trim() || '停止失败' }
        return { success: true }
      }
      case 'restart': {
        // kickstart -k 强制重启
        const r = spawnSync('/bin/launchctl', ['kickstart', '-k', serviceTarget], { encoding: 'utf-8', timeout: 5000 })
        if (r.status !== 0) return { success: false, error: r.stderr.trim() || '重启失败' }
        return { success: true }
      }
      case 'kickstart': {
        const r = spawnSync('/bin/launchctl', ['kickstart', serviceTarget], { encoding: 'utf-8', timeout: 5000 })
        if (r.status !== 0) return { success: false, error: r.stderr.trim() || '立即运行失败' }
        return { success: true }
      }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ========== 读日志 ==========

export function readTaskLog(logPath: string, lines: number = 100): { success: boolean; content?: string; error?: string } {
  try {
    if (!existsSync(logPath)) {
      return { success: false, error: '日志文件不存在' }
    }
    const result = spawnSync('/usr/bin/tail', [`-n`, String(lines), logPath], {
      encoding: 'utf-8',
      timeout: 3000,
    })
    if (result.status !== 0) {
      return { success: false, error: result.stderr.trim() || '读取失败' }
    }
    return { success: true, content: result.stdout }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
