// 单个终端面板组件 — 封装 xterm.js 实例
import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalPaneProps {
  /** 终端唯一标识 */
  terminalId: string
  /** 显示标题 */
  title: string
  /** 项目名称（用于颜色标识） */
  projectName?: string
  /** 项目颜色 */
  projectColor?: string
  /** 是否当前激活（聚焦） */
  isActive?: boolean
  /** 是否处于通知闪烁态（Claude Code Stop/Notification hook 触发） */
  notifying?: boolean
  /** 关闭终端回调 */
  onClose?: (terminalId: string) => void
  /** 点击激活回调 */
  onActivate?: (terminalId: string) => void
  /** 终端有新输出时触发（用于清除通知） */
  onData?: (terminalId: string) => void
}

export function TerminalPane({
  terminalId,
  title,
  projectName,
  projectColor = 'var(--text-muted)',
  isActive = false,
  notifying = false,
  onClose,
  onActivate,
  onData: onDataCallback,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // 初始化 xterm.js 终端
  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
      lineHeight: 1.3,
      theme: {
        background: '#0a0e14',
        foreground: '#e2e8f0',
        cursor: '#DA7756',
        cursorAccent: '#0a0e14',
        selectionBackground: 'rgba(218, 119, 86, 0.3)',
        selectionForeground: '#e2e8f0',
        black: '#1a2029',
        red: '#f47067',
        green: '#3FB950',
        yellow: '#D29922',
        blue: '#58A6FF',
        magenta: '#BC8CFF',
        cyan: '#79C0FF',
        white: '#e2e8f0',
        brightBlack: '#3d4754',
        brightRed: '#ff7b72',
        brightGreen: '#7EE787',
        brightYellow: '#e3b341',
        brightBlue: '#79C0FF',
        brightMagenta: '#d2a8ff',
        brightCyan: '#a5d6ff',
        brightWhite: '#f0f6fc',
      },
      allowProposedApi: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)

    // 初始 fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
        // 通知 main process 调整 pty 大小
        window.electronAPI.terminal.resize(terminalId, terminal.cols, terminal.rows)
      } catch {}
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // 监听用户键盘输入，转发到 pty
    const inputDisposable = terminal.onData((data) => {
      window.electronAPI.terminal.write(terminalId, data)
    })

    // 监听 pty 输出数据
    const unsubData = window.electronAPI.terminal.onData((tid, data) => {
      if (tid === terminalId) {
        terminal.write(data)
        onDataCallback?.(terminalId)
      }
    })

    // 监听 pty 退出
    const unsubExit = window.electronAPI.terminal.onExit((tid, _exitCode) => {
      if (tid === terminalId) {
        terminal.write('\r\n\x1b[90m[进程已退出]\x1b[0m\r\n')
      }
    })

    cleanupRef.current = () => {
      inputDisposable.dispose()
      unsubData()
      unsubExit()
    }

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
          window.electronAPI.terminal.resize(terminalId, terminal.cols, terminal.rows)
        } catch {}
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      cleanupRef.current?.()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [terminalId])

  // 激活时聚焦终端并 refit（修复切回后黑屏）
  useEffect(() => {
    if (isActive && terminalRef.current && fitAddonRef.current) {
      // 延迟 refit 等容器尺寸稳定
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit()
          if (terminalRef.current) {
            window.electronAPI.terminal.resize(terminalId, terminalRef.current.cols, terminalRef.current.rows)
            terminalRef.current.focus()
          }
        } catch {}
      })
    }
  }, [isActive, terminalId])

  // 处理关闭
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.(terminalId)
  }, [terminalId, onClose])

  // 处理点击激活
  const handleClick = useCallback(() => {
    onActivate?.(terminalId)
  }, [terminalId, onActivate])

  return (
    <div
      className={`flex flex-col h-full overflow-hidden rounded-lg ${notifying ? 'notify-pulse' : ''}`}
      style={{
        border: isActive
          ? '1px solid var(--accent)'
          : '1px solid var(--border)',
        transition: 'border-color 0.15s ease',
      }}
      onClick={handleClick}
    >
      {/* 终端标题栏 */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: '32px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 项目颜色圆点 */}
          <div
            className="shrink-0 rounded-full"
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: projectColor,
            }}
          />
          {/* 标题 */}
          <span
            className="text-xs truncate"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isActive ? 500 : 400,
              fontSize: '11px',
            }}
            title={title}
          >
            {title}
          </span>
          {/* 项目名 */}
          {projectName && (
            <span
              className="text-xs shrink-0"
              style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
              }}
            >
              {projectName}
            </span>
          )}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="shrink-0 flex items-center justify-center rounded cursor-pointer"
          style={{
            width: '20px',
            height: '20px',
            color: 'var(--text-muted)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
          title="关闭终端"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* xterm.js 容器 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        style={{
          backgroundColor: '#0a0e14',
          padding: '4px 0 0 4px',
        }}
      />
    </div>
  )
}
