// 侧边栏组件 — 列出已打开的内部终端 pane
import { useState, useRef } from 'react'
import { getProjectColor } from '../utils/color'
import type { TerminalInfo } from '../types/session'

interface SidebarProps {
  /** 是否显示侧边栏 */
  visible: boolean
  /** 已打开的终端列表 */
  terminals: TerminalInfo[]
  /** 当前激活的终端 ID */
  activeTerminalId: string | null
  /** 切换激活终端 */
  onActivateTerminal: (terminalId: string) => void
  /** 关闭终端 */
  onCloseTerminal: (terminalId: string) => void
}

/**
 * 截断文本到指定长度
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function Sidebar({
  visible,
  terminals,
  activeTerminalId,
  onActivateTerminal,
  onCloseTerminal,
}: SidebarProps) {
  // 侧边栏是否收起
  const [collapsed, setCollapsed] = useState(false)
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('')
  // 搜索框 ref
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 过滤终端列表
  const filteredTerminals = searchQuery.trim()
    ? terminals.filter(t => {
        const q = searchQuery.trim().toLowerCase()
        const nameMatch = t.customName?.toLowerCase().includes(q)
        const promptMatch = t.firstPrompt?.toLowerCase().includes(q)
        const projectMatch = t.projectName?.toLowerCase().includes(q)
        return nameMatch || promptMatch || projectMatch
      })
    : terminals

  if (!visible) return null

  // 收起状态 — 只显示窄竖条
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center shrink-0 border-r"
        style={{
          width: '48px',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          transition: 'width 200ms ease-out',
        }}
      >
        {/* 展开按钮 */}
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center mt-3 cursor-pointer"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="展开侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 收起状态的竖条图标列表 */}
        <div className="mt-4 flex flex-col gap-1 items-center w-full">
          {terminals.map((t) => {
            const isActive = t.terminalId === activeTerminalId
            const color = t.projectName ? getProjectColor(t.projectName) : 'var(--text-muted)'
            return (
              <button
                key={t.terminalId}
                onClick={() => onActivateTerminal(t.terminalId)}
                className="w-full flex items-center justify-center cursor-pointer"
                style={{
                  height: '32px',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={t.customName || t.firstPrompt || t.terminalId}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.5,
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 展开状态 — 完整侧边栏
  return (
    <div
      className="flex flex-col shrink-0 border-r h-full"
      style={{
        width: '220px',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        transition: 'width 200ms ease-out',
      }}
    >
      {/* 顶部工具栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {/* 收起按钮 */}
          <button
            onClick={() => setCollapsed(true)}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="收起侧边栏"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            终端
          </span>

          {/* 终端数量 */}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}
          >
            {terminals.length}
          </span>
        </div>
      </div>

      {/* 搜索框（仅有多个终端时显示） */}
      {terminals.length > 1 && (
        <div className="px-3 py-2">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: 'var(--text-muted)' }}
            >
              <path
                d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.646 11.354a6 6 0 1 1 .708-.708l3.5 3.5a.5.5 0 0 1-.708.708l-3.5-3.5Z"
                fill="currentColor"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="过滤..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded outline-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-active)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            />
          </div>
        </div>
      )}

      {/* 终端列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredTerminals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 px-4"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xs text-center">
              {terminals.length === 0
                ? '没有打开的终端'
                : '没有匹配的终端'}
            </span>
            {terminals.length === 0 && (
              <span
                className="text-xs mt-1 text-center"
                style={{ color: 'var(--text-muted)', fontSize: '11px' }}
              >
                Resume 一些 session 来打开终端
              </span>
            )}
          </div>
        ) : (
          filteredTerminals.map((terminal) => {
            const isActive = terminal.terminalId === activeTerminalId
            const projectColor = terminal.projectName
              ? getProjectColor(terminal.projectName)
              : 'var(--text-muted)'

            // 显示文本：优先用 customName，其次 firstPrompt
            const displayText = terminal.customName
              ? truncateText(terminal.customName, 30)
              : terminal.firstPrompt
                ? truncateText(terminal.firstPrompt, 30)
                : `Terminal ${terminal.terminalId}`

            return (
              <div
                key={terminal.terminalId}
                className="group w-full flex items-stretch text-left cursor-pointer transition-colors duration-150"
                style={{
                  height: '40px',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                }}
                onClick={() => onActivateTerminal(terminal.terminalId)}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? 'var(--bg-active)' : 'transparent'
                }}
              >
                {/* 左侧项目颜色竖条 */}
                <div
                  className="shrink-0"
                  style={{
                    width: '3px',
                    backgroundColor: projectColor,
                    opacity: isActive ? 1 : 0.4,
                    transition: 'opacity 150ms ease',
                  }}
                />

                {/* 内容区 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                  <span
                    className="text-xs truncate block"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                    }}
                  >
                    {displayText}
                  </span>

                  {terminal.projectName && (
                    <span
                      className="text-xs truncate block"
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        lineHeight: '14px',
                      }}
                    >
                      {terminal.projectName}
                    </span>
                  )}
                </div>

                {/* 关闭按钮（hover 时显示） */}
                <button
                  className="shrink-0 flex items-center justify-center mr-1 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  style={{
                    width: '24px',
                    height: '24px',
                    alignSelf: 'center',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTerminal(terminal.terminalId)
                  }}
                  title="关闭终端"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
