// 检查 / 注入 ccIDE 的 Claude Code hook（只追加一条 entry，不动现有）
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')

const CCIDE_MARKER = 'http://127.0.0.1:3458/ccide/notify'

function makeCmd(event: 'stop' | 'notify'): string {
  // -sf silent + fail-on-error; -d @- 从 stdin 读 hook JSON；|| true 保证 ccIDE 离线时不影响用户
  return `curl -sf -X POST -H 'Content-Type: application/json' -d @- '${CCIDE_MARKER}?e=${event}' >/dev/null 2>&1 || true`
}

function readSettings(): any {
  if (!existsSync(SETTINGS_PATH)) return {}
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function isInstalledForEvent(settings: any, event: 'Stop' | 'Notification'): boolean {
  const entries = settings?.hooks?.[event]
  if (!Array.isArray(entries)) return false
  return entries.some((entry: any) => {
    const hs = entry?.hooks
    if (!Array.isArray(hs)) return false
    return hs.some((h: any) => typeof h?.command === 'string' && h.command.includes(CCIDE_MARKER))
  })
}

export function checkHooksInstalled(): { stopInstalled: boolean; notifyInstalled: boolean } {
  const s = readSettings()
  return {
    stopInstalled: isInstalledForEvent(s, 'Stop'),
    notifyInstalled: isInstalledForEvent(s, 'Notification'),
  }
}

export function installHooks(): { success: boolean; backup?: string; error?: string } {
  try {
    // 备份
    const backupPath = `${SETTINGS_PATH}.ccide-backup-${Date.now()}`
    if (existsSync(SETTINGS_PATH)) {
      copyFileSync(SETTINGS_PATH, backupPath)
    }

    const settings = readSettings()
    if (!settings.hooks) settings.hooks = {}

    // Stop
    if (!Array.isArray(settings.hooks.Stop)) settings.hooks.Stop = []
    if (!isInstalledForEvent(settings, 'Stop')) {
      settings.hooks.Stop.push({
        hooks: [{ type: 'command', command: makeCmd('stop') }],
      })
    }

    // Notification
    if (!Array.isArray(settings.hooks.Notification)) settings.hooks.Notification = []
    if (!isInstalledForEvent(settings, 'Notification')) {
      settings.hooks.Notification.push({
        hooks: [{ type: 'command', command: makeCmd('notify') }],
      })
    }

    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true, backup: existsSync(backupPath) ? backupPath : undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
