// CLAUDE.md tab：展示用户级 ~/.claude/CLAUDE.md + 当前项目的 CLAUDE.md
// 两个子 tab 切换（全局 / 项目）。纯展示 markdown 原文（code block 风格）
import { useEffect, useState, useCallback } from 'react'
import type { ClaudeMdBundle } from '../../types/toolsidebar'

interface ClaudeMdTabProps {
  /** 当前激活 session 对应的项目目录，为空则不显示项目级 tab */
  activeProjectPath?: string
}

export function ClaudeMdTab({ activeProjectPath }: ClaudeMdTabProps) {
  const [bundle, setBundle] = useState<ClaudeMdBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'user' | 'project'>('user')

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

  // 若当前子 tab 是 project 但没有 project 内容，自动切回 user
  useEffect(() => {
    if (subTab === 'project' && !bundle?.project) setSubTab('user')
  }, [subTab, bundle])

  const current = subTab === 'user' ? bundle?.user : bundle?.project

  return (
    <div className="flex flex-col h-full">
      {/* 子 tab 切换 */}
      <div className="shrink-0 flex items-center gap-1 px-3 pb-2 pt-1">
        <SubTab label="全局" active={subTab === 'user'} onClick={() => setSubTab('user')} />
        <SubTab
          label="项目"
          active={subTab === 'project'}
          disabled={!bundle?.project}
          onClick={() => bundle?.project && setSubTab('project')}
        />
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

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : subTab === 'project' && !bundle?.project ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            先打开一个 session，才能查看该项目的 CLAUDE.md
          </div>
        ) : !current?.content ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            文件不存在：<br />
            <code className="text-[10px]">{current?.path}</code>
          </div>
        ) : (
          <>
            <div
              className="text-[10px] mb-2 px-1 truncate"
              style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}
              title={current.path}
            >
              {shortPath(current.path)}
            </div>
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
