// 终端面板组件 — 管理多个终端 pane 的 CSS grid 布局
import { TerminalPane } from './TerminalPane'
import { getProjectColor } from '../utils/color'
import type { LayoutType, TerminalInfo } from '../types/session'

interface TerminalPanelProps {
  /** 已打开的终端列表 */
  terminals: TerminalInfo[]
  /** 当前布局类型 */
  layout: LayoutType
  /** 当前激活的终端 ID */
  activeTerminalId: string | null
  /** 关闭终端回调 */
  onCloseTerminal: (terminalId: string) => void
  /** 激活终端回调 */
  onActivateTerminal: (terminalId: string) => void
}

/** 根据布局类型和终端数量计算 CSS grid 样式 */
function getGridStyle(layout: LayoutType, count: number): React.CSSProperties {
  if (count === 0) return {}

  // 单个终端时不需要 grid
  if (count === 1) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
      gap: '2px',
      height: '100%',
    }
  }

  switch (layout) {
    case 'two-col':
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: `repeat(${Math.ceil(count / 2)}, 1fr)`,
        gap: '2px',
        height: '100%',
      }

    case 'three-col':
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: `repeat(${Math.ceil(count / 3)}, 1fr)`,
        gap: '2px',
        height: '100%',
      }

    case 'quad':
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '2px',
        height: '100%',
      }

    case 'stack':
      // 堆叠：只显示当前激活的终端
      return {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gap: '0px',
        height: '100%',
      }

    default:
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '2px',
        height: '100%',
      }
  }
}

export function TerminalPanel({
  terminals,
  layout,
  activeTerminalId,
  onCloseTerminal,
  onActivateTerminal,
}: TerminalPanelProps) {
  // 无终端时显示空状态
  if (terminals.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="text-center max-w-md px-6">
          {/* 终端图标 */}
          <div className="mb-6">
            <svg
              className="mx-auto"
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              style={{ color: 'var(--text-muted)' }}
            >
              <rect x="4" y="8" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M16 24L24 30L16 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="28" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span style={{ color: 'var(--accent)' }}>Claude</span> Session Manager
          </h2>

          <p
            className="text-sm mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            从左侧列表中点击 Resume 打开终端
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            终端将在此区域以内嵌方式显示
          </p>
        </div>
      </div>
    )
  }

  // 堆叠模式：只显示当前激活的终端
  const visibleTerminals = layout === 'stack'
    ? terminals.filter(t => t.terminalId === activeTerminalId)
    : terminals

  // 如果堆叠模式下没有激活的终端，显示第一个
  const displayTerminals = visibleTerminals.length > 0
    ? visibleTerminals
    : layout === 'stack' && terminals.length > 0
      ? [terminals[0]]
      : terminals

  return (
    <div
      className="flex-1 min-h-0 p-1"
      style={{
        backgroundColor: 'var(--bg-primary)',
        ...getGridStyle(layout, displayTerminals.length),
      }}
    >
      {displayTerminals.map((terminal) => (
        <TerminalPane
          key={terminal.terminalId}
          terminalId={terminal.terminalId}
          title={terminal.customName || terminal.firstPrompt || `Terminal ${terminal.terminalId}`}
          projectName={terminal.projectName}
          projectColor={terminal.projectName ? getProjectColor(terminal.projectName) : undefined}
          isActive={terminal.terminalId === activeTerminalId}
          onClose={onCloseTerminal}
          onActivate={onActivateTerminal}
        />
      ))}
    </div>
  )
}
