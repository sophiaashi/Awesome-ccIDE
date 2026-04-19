// 布局切换按钮组组件 — 控制终端面板的 CSS grid 布局
import type { ReactNode } from 'react'
import type { LayoutType } from '../types/session'

/** 布局配置 */
interface LayoutConfig {
  type: LayoutType
  label: string
  icon: (active: boolean) => ReactNode
}

function TwoColIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="0.5" y="0.5" width="7.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="10" y="0.5" width="7.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  )
}

function ThreeColIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="0.5" y="0.5" width="4.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="6.75" y="0.5" width="4.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="13" y="0.5" width="4.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  )
}

function QuadIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="0.5" y="0.5" width="7.5" height="5.5" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="10" y="0.5" width="7.5" height="5.5" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="0.5" y="8" width="7.5" height="5.5" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="10" y="8" width="7.5" height="5.5" rx="1" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  )
}

function StackIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="3" y="0.5" width="12" height="9" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="1.5" y="2.5" width="12" height="9" rx="1" stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
      <rect x="4.5" y="4.5" width="12" height="9" rx="1" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
    </svg>
  )
}

/** 所有布局配置 */
const LAYOUTS: LayoutConfig[] = [
  {
    type: 'two-col',
    label: '双列',
    icon: (active) => <TwoColIcon active={active} />,
  },
  {
    type: 'three-col',
    label: '三列',
    icon: (active) => <ThreeColIcon active={active} />,
  },
  {
    type: 'quad',
    label: '四宫格',
    icon: (active) => <QuadIcon active={active} />,
  },
  {
    type: 'stack',
    label: '堆叠',
    icon: (active) => <StackIcon active={active} />,
  },
]

interface LayoutBarProps {
  /** 当前激活的布局 */
  activeLayout: LayoutType
  /** 切换布局回调 */
  onLayoutChange: (layout: LayoutType) => void
}

export function LayoutBar({ activeLayout, onLayoutChange }: LayoutBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* 布局标签 */}
      <span
        className="text-xs mr-1"
        style={{ color: 'var(--text-muted)' }}
      >
        布局
      </span>

      {/* 布局按钮组 */}
      <div
        className="flex items-center rounded overflow-hidden"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {LAYOUTS.map((layout, index) => {
          const isActive = activeLayout === layout.type

          return (
            <button
              key={layout.type}
              onClick={() => onLayoutChange(layout.type)}
              title={layout.label}
              className="flex items-center justify-center transition-all duration-150 cursor-pointer"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                borderRight: index < LAYOUTS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {layout.icon(isActive)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
