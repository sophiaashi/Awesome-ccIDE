// CLAUDE.md tab：展示 + 编辑用户级 ~/.claude/CLAUDE.md + 当前项目的 CLAUDE.md
import { useEffect, useState, useCallback, useRef } from 'react'
import type { ClaudeMdBundle } from '../../types/toolsidebar'

interface ClaudeMdTabProps {
  activeProjectPath?: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function ClaudeMdTab({ activeProjectPath }: ClaudeMdTabProps) {
  const [bundle, setBundle] = useState<ClaudeMdBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'user' | 'project'>('user')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.tools.loadClaudeMd(activeProjectPath)
      setBundle(data as ClaudeMdBundle)
    } finally {
      setLoading(false)
    }
  }, [activeProjectPath])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (subTab === 'project' && !bundle?.project) setSubTab('user')
  }, [subTab, bundle])

  // 切换子 tab / 主数据变化时，退出编辑模式
  useEffect(() => { setEditing(false); setSaveStatus('idle') }, [subTab, bundle])

  const current = subTab === 'user' ? bundle?.user : bundle?.project

  const startEdit = useCallback(() => {
    setDraft(current?.content || '')
    setEditing(true)
    setSaveStatus('idle')
    setSaveError('')
    // 下一帧聚焦
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [current])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDraft('')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!current?.path) return
    setSaveStatus('saving')
    try {
      const res = await window.electronAPI.tools.saveClaudeMd(current.path, draft)
      if (!res.success) {
        setSaveError(res.error || '保存失败')
        setSaveStatus('error')
        return
      }
      // 更新本地 bundle，避免重新 load 闪烁
      setBundle(b => {
        if (!b) return b
        if (subTab === 'user') {
          return { ...b, user: { ...b.user, content: draft } }
        } else if (b.project) {
          return { ...b, project: { ...b.project, content: draft } }
        }
        return b
      })
      setSaveStatus('saved')
      setEditing(false)
      setTimeout(() => setSaveStatus('idle'), 1800)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '未知错误')
      setSaveStatus('error')
    }
  }, [current, draft, subTab])

  return (
    <div className="flex flex-col h-full">
      {/* 子 tab + 操作按钮 */}
      <div className="shrink-0 flex items-center gap-1 px-3 pb-2 pt-1">
        <SubTab label="全局" active={subTab === 'user'} onClick={() => setSubTab('user')} />
        <SubTab
          label="项目"
          active={subTab === 'project'}
          disabled={!bundle?.project}
          onClick={() => bundle?.project && setSubTab('project')}
        />
        <div className="flex-1" />
        {/* 状态提示 */}
        {saveStatus === 'saved' && (
          <span className="text-[10px] font-[510] mr-1" style={{ color: 'var(--success, #3FB950)' }}>✓ 已保存</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-[10px] font-[510] mr-1 truncate max-w-[120px]" style={{ color: 'var(--accent)' }} title={saveError}>
            {saveError || '失败'}
          </span>
        )}
        {editing ? (
          <>
            <button
              onClick={cancelEdit}
              className="shrink-0 text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >取消</button>
            <button
              onClick={saveEdit}
              disabled={saveStatus === 'saving'}
              className="shrink-0 text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >{saveStatus === 'saving' ? '保存中...' : '保存'}</button>
          </>
        ) : (
          <>
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
            {current && (
              <button
                onClick={startEdit}
                className="shrink-0 text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
                style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}
                title={current.content ? '编辑当前文件' : '创建新文件'}
              >{current.content ? '编辑' : '创建'}</button>
            )}
          </>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : subTab === 'project' && !bundle?.project ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            先打开一个 session，才能查看该项目的 CLAUDE.md
          </div>
        ) : (
          <>
            <div
              className="text-[10px] mb-2 px-1 truncate"
              style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}
              title={current?.path}
            >
              {current ? shortPath(current.path) : ''}
            </div>
            {editing ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  // ⌘+S 保存
                  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                    e.preventDefault()
                    saveEdit()
                  }
                  // Esc 取消
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelEdit()
                  }
                }}
                spellCheck={false}
                className="w-full text-[12px] outline-none resize-none"
                style={{
                  minHeight: 'calc(100vh - 240px)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.55,
                  fontFamily: "'SF Mono', monospace",
                  background: 'var(--bg-tertiary)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--accent-border, var(--accent))',
                }}
              />
            ) : !current?.content ? (
              <div className="text-[12px] pt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                文件不存在。点上方「创建」按钮新建一个
              </div>
            ) : (
              <pre
                className="text-[12px] whitespace-pre-wrap break-words"
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  fontFamily: "'SF Mono', monospace",
                  background: 'var(--bg-tertiary)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                {current.content}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SubTab({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer transition-colors"
      style={{
        background: active ? 'rgba(218,119,86,0.12)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : active ? 'var(--accent)' : 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function shortPath(p: string): string {
  const home = '/Users/' + (p.match(/^\/Users\/([^/]+)/)?.[1] || '')
  return home && p.startsWith(home) ? '~' + p.slice(home.length) : p
}
