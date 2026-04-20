// 后台任务 tab：展示 ~/Library/LaunchAgents/ 下你自装的 launchd 服务
// 支持启动 / 停止 / 重启 / 立即运行 / 看日志 / 自定义命名
import { useEffect, useState, useCallback, useRef } from 'react'
import type { BackgroundTask } from '../../types/toolsidebar'

type TaskAction = 'start' | 'stop' | 'restart' | 'kickstart'

export function BackgroundTasksTab() {
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [actionError, setActionError] = useState<{ label: string; msg: string } | null>(null)
  const [renamingLabel, setRenamingLabel] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI.tools.listTasks()
      setTasks(list as BackgroundTask[])
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
      setActionError({ label: task.label, msg: res.error || '操作失败' })
      return
    }
    // 短暂等 launchctl 更新状态后重查
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
      // 第一次点：进入确认态
      setPendingDelete(task.label)
      setTimeout(() => setPendingDelete(prev => prev === task.label ? null : prev), 4000)
      return
    }
    // 第二次点：真删
    setPendingDelete(null)
    setActionError(null)
    const res = await window.electronAPI.tools.taskDelete(task.label, task.plistPath)
    if (!res.success) {
      setActionError({ label: task.label, msg: res.error || '删除失败' })
      return
    }
    load()
  }, [pendingDelete, load])

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-2 pt-1">
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          共 {tasks.length} 个任务
          {tasks.filter(t => t.pid !== null).length > 0 && (
            <>
              ，<span style={{ color: 'var(--success, #3FB950)' }}>
                {tasks.filter(t => t.pid !== null).length} 运行中
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
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : tasks.length === 0 ? (
          <div className="text-[12px] pt-6 px-4 text-center" style={{ color: 'var(--text-muted)' }}>
            没有找到任务。<br />
            位置：<code className="text-[10px]">~/Library/LaunchAgents/</code>
          </div>
        ) : tasks.map(task => {
          const isExpanded = expandedLog === task.label
          const isRenaming = renamingLabel === task.label
          const hasError = actionError?.label === task.label
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
                {/* 状态点 */}
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
                  {/* 任务名 + 编辑 */}
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

                  {/* Label（永远显示，小字） */}
                  <div
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}
                    title={task.label}
                  >
                    {task.label}
                  </div>
                </div>

                {/* 重命名按钮 */}
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

              {/* 脚本路径 */}
              {task.programArguments && task.programArguments.length > 0 && (
                <div
                  className="text-[10px] mt-1 truncate"
                  style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace", opacity: 0.7 }}
                  title={task.programArguments.join(' ')}
                >
                  {task.programArguments[task.programArguments.length - 1]}
                </div>
              )}

              {/* 错误提示 */}
              {hasError && (
                <div className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
                  ✗ {actionError.msg}
                </div>
              )}

              {/* 操作按钮 */}
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

              {/* 展开的日志 */}
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
      </div>
    </div>
  )
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
      style={{
        background: `${m.color}22`,
        color: m.color,
        fontSize: '9px',
      }}
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
      title={confirming ? '再点一次确认删除' : '删除任务（会先 bootout + rm plist）'}
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
