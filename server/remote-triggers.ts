// 管理 Anthropic 云端 RemoteTrigger（Claude 远程定时任务）
// 鉴权：从 macOS keychain 读 Claude Code OAuth accessToken
// API：GET/PATCH/DELETE https://api.anthropic.com/v1/code/triggers
import { spawnSync } from 'child_process'

const API_BASE = 'https://api.anthropic.com'
const BETA_HEADERS = 'ccr-triggers-2026-01-30,oauth-2025-04-20'

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

function getAccessToken(): string | null {
  try {
    const r = spawnSync('/usr/bin/security', [
      'find-generic-password',
      '-s', 'Claude Code-credentials',
      '-w',
    ], { encoding: 'utf-8', timeout: 3000 })
    if (r.status !== 0) return null
    const json = JSON.parse(r.stdout.trim())
    return json?.claudeAiOauth?.accessToken || null
  } catch {
    return null
  }
}

async function apiRequest(
  urlPath: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const token = getAccessToken()
  if (!token) {
    return { ok: false, status: 0, error: '未找到 Claude Code 登录态，请先在终端运行 `claude` 登录' }
  }
  try {
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': BETA_HEADERS,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch {}
    if (!res.ok) {
      const msg = data?.error?.message || text || `HTTP ${res.status}`
      return { ok: false, status: res.status, data, error: msg }
    }
    return { ok: true, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

function extractFirstMessage(raw: any): string {
  try {
    const ev = raw?.job_config?.ccr?.events?.[0]
    const content = ev?.data?.message?.content
    if (typeof content === 'string') return content.slice(0, 300)
  } catch {}
  return ''
}

function normalize(raw: any): RemoteTrigger {
  return {
    id: raw.id,
    name: raw.name || '(未命名)',
    cronExpression: raw.cron_expression || '',
    nextRunAt: raw.next_run_at || null,
    enabled: !!raw.enabled,
    endedReason: raw.ended_reason || '',
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    environmentId: raw.job_config?.ccr?.environment_id || null,
    firstMessage: extractFirstMessage(raw),
  }
}

export async function listRemoteTriggers(): Promise<RemoteTriggerListResult> {
  const r = await apiRequest('/v1/code/triggers')
  if (!r.ok) {
    const authRequired = r.status === 401 || r.status === 403
    return { success: false, error: r.error, authRequired }
  }
  const arr = Array.isArray(r.data?.data) ? r.data.data : []
  return { success: true, triggers: arr.map(normalize) }
}

export async function toggleRemoteTrigger(
  id: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  const r = await apiRequest(`/v1/code/triggers/${id}`, {
    method: 'PATCH',
    body: { enabled },
  })
  if (!r.ok) return { success: false, error: r.error }
  return { success: true }
}

export async function deleteRemoteTrigger(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const r = await apiRequest(`/v1/code/triggers/${id}`, { method: 'DELETE' })
  if (!r.ok) return { success: false, error: r.error }
  return { success: true }
}
