// Skills 列表 tab：按 14 个分类展示（规则来自飞书文档）
// 点击 skill 行 → 复制 skill 名到剪贴板
import { useEffect, useState, useCallback, useMemo } from 'react'
import type { SkillInfo } from '../../types/toolsidebar'

/**
 * 分类规则（与飞书文档《Claude Code Skill 分类规则与最终列表》保持一致）
 * - 按顺序匹配：先匹配到的优先
 * - 匹配方式：skill 名包含任一 pattern 即归该分类
 * - 未命中归「其他」
 */
const CATEGORIES: { id: string; label: string; patterns: string[] }[] = [
  { id: 'design',    label: '设计 / Design',    patterns: ['design-'] },
  { id: 'qa',        label: 'QA / 测试',        patterns: ['qa', 'test-', 'benchmark', 'investigate'] },
  { id: 'ship',      label: '部署 / Ship',      patterns: ['ship', 'deploy', 'land-', 'setup-deploy'] },
  { id: 'security',  label: '安全 / 审计',      patterns: ['cso', 'careful', 'guard', 'freeze', 'unfreeze'] },
  { id: 'review',    label: '代码审查',         patterns: ['review', 'codex'] },
  { id: 'plan',      label: '规划 / 回顾',      patterns: ['plan-', 'retro', 'office-', 'autoplan'] },
  { id: 'browser',   label: '浏览器',           patterns: ['browse', 'connect-chrome', 'setup-browser', 'canary', 'gstack-upgrade'] },
  { id: 'docs',      label: '文档 / 笔记',      patterns: ['obsidian', 'document-', 'learn'] },
  { id: 'marketing', label: '营销 / Marketing', patterns: ['claude-blog', 'geo', 'seo-geo'] },
  { id: 'product',   label: '产品研发',         patterns: ['harness', 'gstack'] },
  { id: 'env',       label: '环境与基础',       patterns: ['daemon-loop', 'teamo-env'] },
  { id: 'workflow',  label: '日常工作流',       patterns: ['hr-interview', 'interview'] },
  { id: 'content',   label: '内容创作',         patterns: ['humanizer'] },
  { id: 'lark',      label: '飞书 / Lark',      patterns: ['lark-', 'feishu'] },
]

function categorize(skillName: string): string {
  const lower = skillName.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => lower.includes(p))) {
      return cat.id
    }
  }
  return 'other'
}

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

  const filtered = useMemo(() => {
    if (!query.trim()) return skills
    const q = query.toLowerCase()
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.sourceLabel.toLowerCase().includes(q)
    )
  }, [skills, query])

  // 按分类分组
  const grouped = useMemo(() => {
    const map = new Map<string, SkillInfo[]>()
    for (const s of filtered) {
      const cid = categorize(s.name)
      if (!map.has(cid)) map.set(cid, [])
      map.get(cid)!.push(s)
    }
    // 排序：分类内按 name 字母
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [filtered])

  const copy = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
      setCopiedName(name)
      setTimeout(() => setCopiedName(null), 1500)
    } catch {}
  }, [])

  // 分类折叠状态（localStorage 持久化）
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('ccide-skills-collapsed-cats')
      if (raw) return new Set(JSON.parse(raw) as string[])
    } catch {}
    return new Set()
  })
  useEffect(() => {
    localStorage.setItem('ccide-skills-collapsed-cats', JSON.stringify([...collapsedCats]))
  }, [collapsedCats])

  const toggleCat = useCallback((id: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const gstackCount = filtered.filter(s => s.sourceLabel === 'gstack').length

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
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

      {/* 总数提示 + 批量折叠/展开 */}
      {!loading && (
        <div className="shrink-0 px-3 pb-1.5 flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>
            共 {filtered.length} 个 skill{gstackCount > 0 && <>，<span style={{ color: 'var(--accent)' }}>{gstackCount} 来自 gstack [g]</span></>}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setCollapsedCats(new Set([...CATEGORIES.map(c => c.id), 'other']))}
            className="cursor-pointer hover:text-[var(--accent)] transition-colors"
            title="全部折叠"
          >全部折叠</button>
          <span style={{ opacity: 0.3 }}>|</span>
          <button
            onClick={() => setCollapsedCats(new Set())}
            className="cursor-pointer hover:text-[var(--accent)] transition-colors"
            title="全部展开"
          >全部展开</button>
        </div>
      )}

      {/* 列表（按分类） */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>没有匹配的 skill</div>
        ) : (
          <>
            {/* 按文档定义的顺序显示分类 */}
            {CATEGORIES.map(cat => {
              const items = grouped.get(cat.id)
              if (!items || items.length === 0) return null
              return (
                <CategorySection
                  key={cat.id}
                  label={cat.label}
                  count={items.length}
                  collapsed={collapsedCats.has(cat.id)}
                  onToggle={() => toggleCat(cat.id)}
                >
                  {items.map(s => (
                    <SkillRow
                      key={s.filePath}
                      skill={s}
                      isCopied={copiedName === s.name}
                      onClick={() => copy(s.name)}
                    />
                  ))}
                </CategorySection>
              )
            })}

            {/* 其他 */}
            {grouped.get('other') && grouped.get('other')!.length > 0 && (
              <CategorySection
                label="其他"
                count={grouped.get('other')!.length}
                collapsed={collapsedCats.has('other')}
                onToggle={() => toggleCat('other')}
              >
                {grouped.get('other')!.map(s => (
                  <SkillRow
                    key={s.filePath}
                    skill={s}
                    isCopied={copiedName === s.name}
                    onClick={() => copy(s.name)}
                  />
                ))}
              </CategorySection>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CategorySection({
  label, count, collapsed, onToggle, children,
}: {
  label: string
  count: number
  collapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 first:mt-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-all"
        style={{
          background: 'var(--bg-tertiary)',
          borderLeft: '3px solid var(--accent)',
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      >
        <svg
          width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{
            color: 'var(--text-muted)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
        <span className="flex-1 text-left text-[13px] font-[590] truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {label}
        </span>
        <span
          className="text-[10.5px] font-[590] tabular-nums px-1.5 py-[1px] rounded-[3px]"
          style={{ background: 'rgba(218,119,86,0.15)', color: 'var(--accent)' }}
        >
          {count}
        </span>
      </button>
      {!collapsed && <div className="mt-1 pl-1">{children}</div>}
    </div>
  )
}

function SkillRow({ skill, isCopied, onClick }: { skill: SkillInfo; isCopied: boolean; onClick: () => void }) {
  const isGstack = skill.sourceLabel === 'gstack'
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-md px-2 py-1 mb-0.5 transition-colors"
      style={{ background: isCopied ? 'rgba(218,119,86,0.12)' : 'transparent' }}
      onMouseEnter={e => { if (!isCopied) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={e => { if (!isCopied) e.currentTarget.style.background = 'transparent' }}
      title={`点击复制: /${skill.name}\n\n${skill.filePath}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-[510] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
          /{skill.name}
          {isGstack && (
            <span className="ml-1 text-[9px] font-[510]" style={{ color: 'var(--accent)' }}>[g]</span>
          )}
        </span>
        {isCopied && (
          <span className="text-[9px] font-[510] shrink-0" style={{ color: 'var(--accent)' }}>✓ 已复制</span>
        )}
      </div>
      {skill.description && (
        <p className="text-[11px] mt-px line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.35 }}>
          {skill.description}
        </p>
      )}
    </div>
  )
}
