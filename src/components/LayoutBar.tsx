// 布局切换按钮组组件
import { useState } from 'react'
import type { ReactNode } from 'react'

/** 布局类型 */
type LayoutType = 'two-col' | 'three-col' | 'quad' | 'stack'

/** 布局配置 */
interface LayoutConfig {
  type: LayoutType
  label: string
  /** SVG 图标渲染函数 */
  icon: (active: boolean) => ReactNode
}

/**
 * 双列布局图标
 */
function TwoColIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="0.5" y="0.5" width="7.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
      <rect x="10" y="0.5" width="7.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  )
}

/**
 * 三列布局图标
 */
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

/**
 * 四宫格布局图标
 */
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

/**
 * 堆叠布局图标
 */
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

/**
 * 全屏模式图标
 */
function FullscreenIcon({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : 'var(--text-secondary)'
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      {/* 侧边栏 */}
      <rect x="0.5" y="0.5" width="5" height="13" rx="1" stroke={color} strokeWidth="1" fill={active ? 'rgba(255,255,255,0.3)' : 'none'} />
      {/* 主区域 */}
      <rect x="7" y="0.5" width="10.5" height="13" rx="1" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  )
}

interface LayoutBarProps {
  /** 是否处于全屏模式 */
  isFullscreen?: boolean
  /** 切换全屏模式 */
  onToggleFullscreen?: () => void
}

export function LayoutBar({ isFullscreen = false, onToggleFullscreen }: LayoutBarProps) {
  // 当前激活的布局
  const [activeLayout, setActiveLayout] = useState<LayoutType | null>(null)
  // 正在加载的布局（点击后等待 API 响应）
  const [loadingLayout, setLoadingLayout] = useState<LayoutType | null>(null)
  // 提示信息（无终端窗口等）
  const [toast, setToast] = useState<string | null>(null)

  /**
   * 点击布局按钮，调用后端 API 设置布局
   */
  const handleLayoutClick = async (layoutType: LayoutType) => {
    if (loadingLayout) return // 防止重复点击

    setLoadingLayout(layoutType)
    setToast(null)

    try {
      const response = await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: layoutType }),
      })

      const data = await response.json()

      if (!response.ok) {
        setToast(data.error || '布局设置失败')
        setTimeout(() => setToast(null), 3000)
        return
      }

      if (data.windowCount === 0) {
        setToast('没有打开的终端窗口')
        setTimeout(() => setToast(null), 3000)
        return
      }

      // 成功：激活当前布局
      setActiveLayout(layoutType)
    } catch (err) {
      setToast('网络错误，请重试')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoadingLayout(null)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 relative">
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
          const isLoading = loadingLayout === layout.type

          return (
            <button
              key={layout.type}
              onClick={() => handleLayoutClick(layout.type)}
              disabled={!!loadingLayout}
              title={layout.label}
              className="flex items-center justify-center transition-all duration-150 cursor-pointer disabled:cursor-wait"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                borderRight: index < LAYOUTS.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: loadingLayout && !isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !loadingLayout) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {isLoading ? (
                // 加载中旋转动画
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{ color: isActive ? '#FFFFFF' : 'var(--text-secondary)' }}
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="20 14"
                  />
                </svg>
              ) : (
                layout.icon(isActive)
              )}
            </button>
          )
        })}
      </div>

      {/* 分隔线 */}
      <div
        className="h-4 w-px"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* 全屏模式按钮 */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? '退出全屏 (Esc)' : '全屏模式'}
        className="flex items-center justify-center cursor-pointer transition-all duration-150"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: isFullscreen ? 'var(--accent)' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={(e) => {
          if (!isFullscreen) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isFullscreen) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        <FullscreenIcon active={isFullscreen} />
      </button>

      {/* 提示信息 toast */}
      {toast && (
        <span
          className="text-xs px-2 py-1 rounded whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(218, 119, 86, 0.2)',
            color: 'var(--accent)',
            fontSize: '11px',
          }}
        >
          {toast}
        </span>
      )}
    </div>
  )
}
