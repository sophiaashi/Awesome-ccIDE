// Skills 列表 tab：展示 ~/.claude/skills + ~/.claude/plugins 下的所有 SKILL.md
// 点击 skill 行 → 复制 skill 名到剪贴板
import { useEffect, useState, useCallback } from 'react'
import type { SkillInfo } from '../../types/toolsidebar'

export function SkillsTab() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [copiedName, setCopiedName] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI.tools.loadSkills()
      setSkills(list as SkillInfo[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = skills.filter(s => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.sourceLabel.toLowerCase().includes(q)
  })

  const userSkills = filtered.filter(s => s.source === 'user')
  const pluginSkills = filtered.filter(s => s.source === 'plugin')

  const copy = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
      setCopiedName(name)
      setTimeout(() => setCopiedName(null), 1500)
    } catch {}
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏：搜索 + 刷新 */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-2 pt-1">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索 skill..."
          className="flex-1 h-7 px-2 rounded-md text-[12px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
        <button
          onClick={load}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md cursor-pointer"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          title="刷新"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14" />
          </svg>
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>没有匹配的 skill</div>
        ) : (
          <>
            {userSkills.length > 0 && (
              <>
                <SectionHeader label={`自建 (${userSkills.length})`} />
                {userSkills.map(s => (
                  <SkillRow key={s.filePath} skill={s} isCopied={copiedName === s.name} onClick={() => copy(s.name)} />
                ))}
              </>
            )}
            {pluginSkills.length > 0 && (
              <>
                <SectionHeader label={`插件 (${pluginSkills.length})`} />
                {pluginSkills.map(s => (
                  <SkillRow key={s.filePath} skill={s} isCopied={copiedName === s.name} onClick={() => copy(s.name)} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="text-[10px] font-[510] uppercase tracking-wider mt-2 mb-1.5 px-1"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </div>
  )
}

function SkillRow({ skill, isCopied, onClick }: { skill: SkillInfo; isCopied: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-md px-2 py-1.5 mb-1 transition-colors"
      style={{ background: isCopied ? 'rgba(218,119,86,0.12)' : 'transparent' }}
      onMouseEnter={e => { if (!isCopied) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={e => { if (!isCopied) e.currentTarget.style.background = 'transparent' }}
      title={`点击复制: ${skill.name}\n\n${skill.filePath}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-[510] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
          {skill.name}
        </span>
        <span
          className="text-[9px] px-1 py-[1px] rounded-[3px] shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
        >
          {skill.sourceLabel}
        </span>
        {isCopied && (
          <span className="text-[9px] font-[510] shrink-0" style={{ color: 'var(--accent)' }}>✓ 已复制</span>
        )}
      </div>
      {skill.description && (
        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {skill.description}
        </p>
      )}
    </div>
  )
}
