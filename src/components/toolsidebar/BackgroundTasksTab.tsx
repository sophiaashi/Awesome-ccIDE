// 后台任务 tab：两个分组
//   📱 本地任务（launchd）— ~/Library/LaunchAgents/*.plist
//   ☁️ 云端任务（Claude 远程）— Anthropic RemoteTrigger API
import { useEffect, useState, useCallback, useRef } from 'react'
import type { BackgroundTask, RemoteTrigger } from '../../types/toolsidebar'

type TaskAction = 'start' | 'stop' | 'restart' | 'kickstart'

interface RemoteState {
  triggers: RemoteTrigger[]
  error: string | null
  authRequired: boolean
  loaded: boolean
}

export function BackgroundTasksTab() {
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [remote, setRemote] = useState<RemoteState>({
    triggers: [], error: null, authRequired: false, loaded: false,
  })
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null)
  const [renamingLabel, setRenamingLabel] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [expandedRemote, setExpandedRemote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, remoteRes] = await Promise.all([
        window.electronAPI.tools.listTasks(),
        window.electronAPI.tools.listRemoteTriggers(),
      ])
      setTasks(list as BackgroundTask[])
      setRemote({
        triggers: (remoteRes.triggers || []) as RemoteTrigger[],
        error: remoteRes.success ? null : (remoteRes.error || '加载失败'),
        authRequired: !!remoteRes.authRequired,
        loaded: true,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (renamingLabel && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [renamingLabel])

  const doAction = useCallback(async (task: BackgroundTask, action: TaskAction) => {
    setActionError(null)
    const res = await window.electronAPI.tools.taskAction(task.label, task.plistPath, action)
    if (!res.success) {
      setActionError({ id: task.label, msg: res.error || '操作失败' })
      return
    }
    setTimeout(load, 500)
  }, [load])

  const toggleLog = useCallback(async (task: BackgroundTask) => {
    if (expandedLog === task.label) {
      setExpandedLog(null)
      setLogContent('')
      return
    }
    const logPath = task.stdOutPath || task.stdErrPath
    if (!logPath) {
      setLogContent('(此任务没有配置 StandardOutPath / StandardErrorPath)')
      setExpandedLog(task.label)
      return
    }
    setExpandedLog(task.label)
    setLogLoading(true)
    const res = await window.electronAPI.tools.taskLog(logPath, 100)
    setLogLoading(false)
    if (res.success) {
      setLogContent(res.content || '(空)')
    } else {
      setLogContent(`读取失败：${res.error}`)
    }
  }, [expandedLog])

  const startRename = useCallback((task: BackgroundTask) => {
    setRenamingLabel(task.label)
    setRenameDraft(task.customName || '')
  }, [])

  const submitRename = useCallback(async () => {
    if (!renamingLabel) return
    await window.electronAPI.tools.taskSetName(renamingLabel, renameDraft)
    setRenamingLabel(null)
    load()
  }, [renamingLabel, renameDraft, load])

  const doDelete = useCallback(async (task: BackgroundTask) => {
    if (pendingDelete !== task.label) {
      setPendingDelete(task.label)
      setTimeout(() => setPendingDelete(prev => prev === task.label ? null : prev), 4000)
      return
    }
    setPendingDelete(null)
    setActionError(null)
    const res = await window.electronAPI.tools.taskDelete(task.label, task.plistPath)
    if (!res.success) {
      setActionError({ id: task.label, msg: res.error || '删除失败' })
      return
    }
    load()
  }, [pendingDelete, load])

  const doRemoteToggle = useCallback(async (trig: RemoteTrigger) => {
    setActionError(null)
    const res = await window.electronAPI.tools.remoteTriggerToggle(trig.id, !trig.enabled)
    if (!res.success) {
      setActionError({ id: trig.id, msg: res.error || '操作失败' })
      return
    }
    load()
  }, [load])

  const doRemoteDelete = useCallback(async (trig: RemoteTrigger) => {
    if (pendingDelete !== trig.id) {
      setPendingDelete(trig.id)
      setTimeout(() => setPendingDelete(prev => prev === trig.id ? null : prev), 4000)
      return
    }
    setPendingDelete(null)
    setActionError(null)
    const res = await window.electronAPI.tools.remoteTriggerDelete(trig.id)
    if (!res.success) {
      setActionError({ id: trig.id, msg: res.error || '删除失败' })
      return
    }
    load()
  }, [pendingDelete, load])

  const localRunning = tasks.filter(t => t.pid !== null).length
  const remoteEnabled = remote.triggers.filter(t => t.enabled && !t.endedReason).length
  const totalCount = tasks.length + remote.triggers.length

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-2 pt-1">
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          共 {totalCount} 个任务
          {localRunning + remoteEnabled > 0 && (
            <>
              ，<span style={{ color: 'var(--success, #3FB950)' }}>
                {localRunning} 本地运行 / {remoteEnabled} 云端启用
              </span>
            </>
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={load}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="刷新"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && !remote.loaded ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : (
          <>
            {/* ====== 本地任务分组 ====== */}
            <SectionHeader
              icon="local"
              title="本地任务"
              subtitle="launchd / ~/Library/LaunchAgents"
              count={tasks.length}
            />
            {tasks.length === 0 ? (
              <div className="text-[11px] px-3 py-3 mb-3" style={{ color: 'var(--text-muted)' }}>
                没有找到 plist 任务
              </div>
            ) : tasks.map(task => {
              const isExpanded = expandedLog === task.label
              const isRenaming = renamingLabel === task.label
              const hasError = actionError?.id === task.label
              const running = task.pid !== null

              return (
                <div
                  key={task.label}
                  className="mb-1.5 rounded-md px-2.5 py-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${running ? 'rgba(63, 185, 80, 0.4)' : 'var(--border)'}`,
                  }}
                >
                  {/* 名称行 */}
                  <div className="flex items-start gap-2 mb-1">
                    <span
                      className="shrink-0 rounded-full mt-1"
                      style={{
                        width: '8px',
                        height: '8px',
                        background: running
                          ? 'var(--success, #3FB950)'
                          : task.loaded ? 'var(--warning, #D29922)' : 'var(--text-muted)',
                        boxShadow: running ? '0 0 6px var(--success, #3FB950)' : 'none',
                      }}
                      title={running ? `运行中 (PID ${task.pid})` : task.loaded ? '已加载但未运行' : '未加载'}
                    />

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          ref={renameRef}
                          value={renameDraft}
                          onChange={e => setRenameDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); submitRename() }
                            if (e.key === 'Escape') { e.preventDefault(); setRenamingLabel(null) }
                          }}
                          onBlur={submitRename}
                          placeholder="给这个任务起个名字..."
                          className="w-full h-6 px-1.5 text-[12px] font-[590] outline-none rounded-[3px]"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                          }}
                        />
                      ) : (
                        <div
                          onDoubleClick={() => startRename(task)}
                          className="text-[12.5px] font-[590] truncate cursor-text"
                          style={{ color: task.customName ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                          title="双击重命名"
                        >
                          {task.customName || <span style={{ fontStyle: 'italic', fontWeight: 400 }}>（未命名）</span>}
                        </div>
                      )}

                      <div
                        className="text-[10px] truncate mt-0.5"
                        style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}
                        title={task.label}
                      >
                        {task.label}
                      </div>
                    </div>

                    {!isRenaming && (
                      <button
                        onClick={() => startRename(task)}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-[3px] cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        title={task.customName ? '重命名' : '起名字'}
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* 元信息 */}
                  <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                    <TypeTag type={task.type} />
                    {task.scheduleDesc && <span>{task.scheduleDesc}</span>}
                    {running && <span>PID <code style={{ color: 'var(--text-secondary)' }}>{task.pid}</code></span>}
                    {task.lastExitStatus !== undefined && !running && (
                      <span>
                        上次退出 <code style={{ color: task.lastExitStatus === 0 ? 'var(--text-secondary)' : 'var(--accent)' }}>
                          {task.lastExitStatus}
                        </code>
                      </span>
                    )}
                  </div>

                  {task.programArguments && task.programArguments.length > 0 && (
                    <div
                      className="text-[10px] mt-1 truncate"
                      style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace", opacity: 0.7 }}
                      title={task.programArguments.join(' ')}
                    >
                      {task.programArguments[task.programArguments.length - 1]}
                    </div>
                  )}

                  {hasError && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
                      ✗ {actionError.msg}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                    {running ? (
                      <>
                        <ActionBtn label="重启" onClick={() => doAction(task, 'restart')} />
                        <ActionBtn label="停止" onClick={() => doAction(task, 'stop')} danger />
                      </>
                    ) : (
                      <ActionBtn label="启动" onClick={() => doAction(task, 'start')} primary />
                    )}
                    {running && <ActionBtn label="立即跑一次" onClick={() => doAction(task, 'kickstart')} />}
                    <div className="flex-1" />
                    <ActionBtn
                      label={isExpanded ? '收起日志' : '看日志'}
                      onClick={() => toggleLog(task)}
                    />
                    <DeleteBtn
                      confirming={pendingDelete === task.label}
                      onClick={() => doDelete(task)}
                    />
                  </div>

                  {isExpanded && (
                    <pre
                      className="mt-2 text-[10.5px] whitespace-pre-wrap break-words overflow-x-auto"
                      style={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        fontFamily: "'SF Mono', monospace",
                        background: 'rgba(0,0,0,0.3)',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      {logLoading ? '加载中…' : logContent}
                    </pre>
                  )}
                </div>
              )
            })}

            {/* ====== 云端任务分组 ====== */}
            <div className="mt-3">
              <SectionHeader
                icon="cloud"
                title="云端任务"
                subtitle="Claude 远程定时（Anthropic）"
                count={remote.triggers.length}
              />
            </div>

            {remote.authRequired ? (
              <div className="text-[11px] px-3 py-3 mb-3 rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                未登录 Claude Code。在终端运行 <code className="text-[10.5px]" style={{ color: 'var(--accent)' }}>claude</code> 登录后点刷新。
              </div>
            ) : remote.error ? (
              <div className="text-[11px] px-3 py-3 mb-3 rounded-md" style={{ color: 'var(--accent)', background: 'var(--bg-tertiary)', border: '1px solid rgba(218,119,86,0.3)' }}>
                加载失败：{remote.error}
              </div>
            ) : remote.triggers.length === 0 ? (
              <div className="text-[11px] px-3 py-3 mb-3" style={{ color: 'var(--text-muted)' }}>
                没有云端定时任务。让 Claude 帮你用 <code className="text-[10.5px]">/schedule</code> 创建一个。
              </div>
            ) : remote.triggers.map(trig => {
              const hasError = actionError?.id === trig.id
              const ended = !!trig.endedReason
              const expanded = expandedRemote === trig.id

              return (
                <div
                  key={trig.id}
                  className="mb-1.5 rounded-md px-2.5 py-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${ended ? 'rgba(218,119,86,0.3)' : trig.enabled ? 'rgba(88,166,255,0.35)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span
                      className="shrink-0 rounded-full mt-1"
                      style={{
                        width: '8px',
                        height: '8px',
                        background: ended
                          ? 'var(--accent)'
                          : trig.enabled
                            ? '#58A6FF'
                            : 'var(--text-muted)',
                        boxShadow: trig.enabled && !ended ? '0 0 6px #58A6FF' : 'none',
                      }}
                      title={ended ? `已结束：${trig.endedReason}` : trig.enabled ? '已启用' : '已停用'}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12.5px] font-[590] truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {trig.name}
                      </div>
                      <div
                        className="text-[10px] truncate mt-0.5"
                        style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}
                        title={trig.id}
                      >
                        {trig.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                    <span
                      className="px-1 py-[0.5px] rounded-[3px] font-[510]"
                      style={{ background: '#58A6FF22', color: '#58A6FF', fontSize: '9px' }}
                    >
                      云端
                    </span>
                    {trig.cronExpression && (
                      <span title="cron 表达式（按创建时的时区解析）">
                        <code style={{ color: 'var(--text-secondary)' }}>{trig.cronExpression}</code>
                      </span>
                    )}
                    {trig.nextRunAt && !ended && (
                      <span>下次 <code style={{ color: 'var(--text-secondary)' }}>{formatLocal(trig.nextRunAt)}</code></span>
                    )}
                    {ended && <span style={{ color: 'var(--accent)' }}>已结束：{trig.endedReason}</span>}
                  </div>

                  {trig.firstMessage && (
                    <div
                      className="text-[10px] mt-1 cursor-pointer"
                      style={{
                        color: 'var(--text-muted)',
                        fontFamily: "'SF Mono', monospace",
                        opacity: 0.7,
                        whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
                        overflow: expanded ? 'visible' : 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onClick={() => setExpandedRemote(prev => prev === trig.id ? null : trig.id)}
                      title={expanded ? '点击收起' : '点击展开完整指令'}
                    >
                      {expanded ? trig.firstMessage : trig.firstMessage.replace(/\n/g, ' ').slice(0, 120)}
                    </div>
                  )}

                  {hasError && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
                      ✗ {actionError.msg}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                    {!ended && (
                      <ActionBtn
                        label={trig.enabled ? '停用' : '启用'}
                        onClick={() => doRemoteToggle(trig)}
                        primary={!trig.enabled}
                        danger={trig.enabled}
                      />
                    )}
                    <div className="flex-1" />
                    <DeleteBtn
                      confirming={pendingDelete === trig.id}
                      onClick={() => doRemoteDelete(trig)}
                    />
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  icon, title, subtitle, count,
}: {
  icon: 'local' | 'cloud'
  title: string
  subtitle: string
  count: number
}) {
  return (
    <div
      className="flex items-center gap-2 px-1 py-1 mb-1"
      style={{ borderLeft: `2px solid ${icon === 'cloud' ? '#58A6FF' : 'var(--accent)'}`, paddingLeft: '8px' }}
    >
      <span style={{ fontSize: '11px' }}>
        {icon === 'cloud' ? '☁️' : '📱'}
      </span>
      <span className="text-[12px] font-[590]" style={{ color: 'var(--text-primary)' }}>
        {title}
      </span>
      <span
        className="text-[10px] px-1 rounded-[3px]"
        style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
      >
        {count}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        · {subtitle}
      </span>
    </div>
  )
}

function formatLocal(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${m}-${day} ${hh}:${mm}`
  } catch {
    return iso
  }
}

function TypeTag({ type }: { type: BackgroundTask['type'] }) {
  const map: Record<BackgroundTask['type'], { label: string; color: string }> = {
    daemon:      { label: '常驻', color: '#58A6FF' },
    scheduled:   { label: '定时', color: '#BC8CFF' },
    'on-demand': { label: '按需', color: '#8B949E' },
    'on-login':  { label: '登录时', color: '#D29922' },
    unknown:     { label: '?',    color: '#8B949E' },
  }
  const m = map[type]
  return (
    <span
      className="px-1 py-[0.5px] rounded-[3px] font-[510]"
      style={{ background: `${m.color}22`, color: m.color, fontSize: '9px' }}
    >
      {m.label}
    </span>
  )
}

function DeleteBtn({ confirming, onClick }: { confirming: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-[510] px-1.5 h-5 rounded-[3px] cursor-pointer transition-all"
      style={{
        background: confirming ? 'var(--accent)' : 'transparent',
        color: confirming ? '#fff' : 'var(--text-muted)',
        border: `1px solid ${confirming ? 'var(--accent)' : 'var(--border)'}`,
      }}
      onMouseEnter={e => {
        if (!confirming) {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'rgba(218,119,86,0.4)'
        }
      }}
      onMouseLeave={e => {
        if (!confirming) {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}
      title={confirming ? '再点一次确认删除' : '删除任务'}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      {confirming && <span>确认？</span>}
    </button>
  )
}

function ActionBtn({
  label, onClick, primary, danger,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-[510] px-1.5 h-5 rounded-[3px] cursor-pointer transition-colors"
      style={{
        background: primary ? 'var(--accent)' : 'transparent',
        color: primary ? '#fff' : danger ? 'var(--accent)' : 'var(--text-secondary)',
        border: `1px solid ${primary ? 'var(--accent)' : danger ? 'rgba(218,119,86,0.3)' : 'var(--border)'}`,
      }}
      onMouseEnter={e => {
        if (primary) { e.currentTarget.style.background = 'var(--accent-hover, #E8956E)' }
        else if (danger) { e.currentTarget.style.background = 'rgba(218,119,86,0.1)' }
        else { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }
      }}
      onMouseLeave={e => {
        if (primary) { e.currentTarget.style.background = 'var(--accent)' }
        else { e.currentTarget.style.background = 'transparent' }
      }}
    >
      {label}
    </button>
  )
}
