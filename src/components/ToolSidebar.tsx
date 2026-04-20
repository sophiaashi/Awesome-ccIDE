// 右侧工具栏主壳
// - 折叠态：40px 窄条，显示 3 个 tab 图标，点击展开
// - 展开态：顶部 tab 切换，底下内容区；左边缘可拖拽调宽
// - 状态持久化到 localStorage
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ToolTabId } from '../types/toolsidebar'
import { SkillsTab } from './toolsidebar/SkillsTab'
import { ShortcutsTab } from './toolsidebar/ShortcutsTab'
import { ClaudeMdTab } from './toolsidebar/ClaudeMdTab'

const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 340
const COLLAPSED_WIDTH = 40

const TABS: { id: ToolTabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'skills',
    label: 'Skills',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'shortcuts',
    label: '快捷键',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </svg>
    ),
  },
  {
    id: 'claudemd',
    label: 'CLAUDE.md',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
]

interface ToolSidebarProps {
  /** 当前激活 session 对应的项目目录（CLAUDE.md tab 用） */
  activeProjectPath?: string
}

export function ToolSidebar({ activeProjectPath }: ToolSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const v = localStorage.getItem('ccide-toolsidebar-collapsed')
    return v === null ? true : v === '1'
  })
  const [width, setWidth] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('ccide-toolsidebar-width') || '', 10)
    return Number.isFinite(v) && v >= MIN_WIDTH && v <= MAX_WIDTH ? v : DEFAULT_WIDTH
  })
  const [tab, setTab] = useState<ToolTabId>(() => {
    const v = localStorage.getItem('ccide-toolsidebar-tab') as ToolTabId | null
    return v && TABS.some(t => t.id === v) ? v : 'skills'
  })

  useEffect(() => { localStorage.setItem('ccide-toolsidebar-collapsed', collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => { localStorage.setItem('ccide-toolsidebar-width', String(width)) }, [width])
  useEffect(() => { localStorage.setItem('ccide-toolsidebar-tab', tab) }, [tab])

  // 拖拽调宽（从左边缘向左拉变宽）
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (collapsed) return
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      // 左边缘拖：鼠标向左 → delta 负 → 宽度加
      const delta = dragStartX.current - ev.clientX
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta))
      setWidth(newWidth)
    }
    const onUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [collapsed, width])

  const clickTab = useCallback((id: ToolTabId) => {
    if (collapsed) {
      setTab(id)
      setCollapsed(false)
    } else if (tab === id) {
      // 重复点激活 tab → 收起
      setCollapsed(true)
    } else {
      setTab(id)
    }
  }, [collapsed, tab])

  return (
    <>
      {/* 左边缘拖拽条（只在展开时显示） */}
      {!collapsed && (
        <div
          className="shrink-0 cursor-col-resize group"
          style={{ width: '5px', position: 'relative' }}
          onMouseDown={handleDragStart}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--accent)' }} />
        </div>
      )}

      {/* 主体 */}
      <div
        className="shrink-0 flex flex-col h-full"
        style={{
          width: collapsed ? `${COLLAPSED_WIDTH}px` : `${width}px`,
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: collapsed ? '1px solid var(--border)' : 'none',
          overflow: 'hidden',
        }}
      >
        {collapsed ? (
          /* 折叠：竖向 tab 图标 */
          <div className="flex flex-col items-center gap-1 pt-10">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => clickTab(t.id)}
                className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer"
                style={{
                  color: 'var(--text-muted)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
                title={`${t.label}（点击展开）`}
              >
                {t.icon}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* 顶部：tab 条 + 折叠按钮 */}
            <div
              className="shrink-0 flex items-center gap-0.5 px-2"
              style={{
                height: '38px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => clickTab(t.id)}
                  className="flex items-center gap-1.5 px-2.5 h-7 rounded-md cursor-pointer transition-colors"
                  style={{
                    background: tab === t.id ? 'var(--bg-tertiary)' : 'transparent',
                    color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {t.icon}
                  <span className="text-[11px] font-[510]">{t.label}</span>
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setCollapsed(true)}
                className="w-6 h-6 flex items-center justify-center rounded-md cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                title="收起"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 min-h-0 pt-1">
              {tab === 'skills' && <SkillsTab />}
              {tab === 'shortcuts' && <ShortcutsTab />}
              {tab === 'claudemd' && <ClaudeMdTab activeProjectPath={activeProjectPath} />}
            </div>
          </>
        )}
      </div>
    </>
  )
}
