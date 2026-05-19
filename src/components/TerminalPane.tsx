// 单个终端面板组件 — 封装 xterm.js 实例
import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalPaneProps {
  /** 终端唯一标识 */
  terminalId: string
  /** 显示标题（fallback：firstPrompt 或 Terminal {id}） */
  title: string
  /** 当前自定义名称（用于 in-place 重命名输入框初始值） */
  customName?: string
  /** 关联的 session ID（为空时不允许重命名） */
  sessionId?: string
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
  /** 重命名回调（提交时调用，name 为空表示删除自定义名称） */
  onRename?: (terminalId: string, name: string) => void
}

export function TerminalPane({
  terminalId,
  title,
  customName,
  sessionId,
  projectName,
  projectColor = 'var(--text-muted)',
  isActive = false,
  notifying = false,
  onClose,
  onActivate,
  onData: onDataCallback,
  onRename,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  /** 用户在 Claude Code 输入框里"还没提交"的输入 — 用于 cmd+z 撤销整段 */
  const pendingInputRef = useRef('')

  // 重命名状态
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

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
      // 按住 Option 拖动 = 强制选择，忽略 TUI 的鼠标追踪（修复 Claude Code 里很难拖选的问题）
      macOptionClickForcesSelection: true,
      // 双击选词、右键自动选词
      rightClickSelectsWord: true,
      // OSC 8 超链接处理（Claude/teamo 在 Sources 里输出的 markdown 链接走的是这个协议）
      linkHandler: {
        activate: (_event, text) => {
          if (!text) return
          // 只放行 http/https/mailto，其它协议忽略避免安全问题
          if (/^(https?|mailto):/i.test(text)) {
            window.electronAPI.shell.openExternal(text).catch(() => {})
          }
        },
      },
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.electronAPI.shell.openExternal(uri).catch(() => {})
    })

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    // cmd+z 撤销：发送 pendingInput.length 个 Backspace（\x7f），把"还没提交的输入"整段抹掉。
    // 同时也在这里追踪 Enter 提交时机：不带 modifier 的 Enter = 提交，清空 buffer；
    // Shift/Alt/Option + Enter = 换行，buffer 追加 \n
    terminal.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true
      // cmd+c → 复制选区：xterm 默认复制有两个坑
      //   1) 每行末尾会带上 cell 填充空格 → trimEnd
      //   2) 长行被终端宽度自动 wrap 出来的"软换行"也会变成 \n → 用 buffer line.isWrapped 判断，软换行不加 \n
      // 无选区时不拦截（让默认行为接管）。
      if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
        const pos = terminal.getSelectionPosition()
        if (pos) {
          const buf = terminal.buffer.active
          let out = ''
          for (let y = pos.start.y; y <= pos.end.y; y++) {
            const line = buf.getLine(y)
            if (!line) continue
            const startCol = y === pos.start.y ? pos.start.x : 0
            const endCol = y === pos.end.y ? pos.end.x : undefined
            out += line.translateToString(false, startCol, endCol)
            if (y < pos.end.y) {
              const next = buf.getLine(y + 1)
              // 下一行是软换行（wrap 出来的）→ 同一逻辑行，不加 \n
              if (!next?.isWrapped) out += '\n'
            }
          }
          const cleaned = out.split('\n').map(l => l.replace(/[\s\u00a0]+$/u, '')).join('\n')
          navigator.clipboard.writeText(cleaned).catch(() => {})
          e.preventDefault()
          return false
        }
        return true
      }
      // cmd+z（也兼容 cmd+shift+z）→ 撤销整段未提交输入
      if (e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'z') {
        const len = pendingInputRef.current.length
        if (len > 0) {
          window.electronAPI.terminal.write(terminalId, '\x7f'.repeat(len))
          pendingInputRef.current = ''
        }
        e.preventDefault()
        return false
      }
      // Enter 提交（不带任何 modifier）→ 清空 buffer
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.altKey && !e.ctrlKey) {
        pendingInputRef.current = ''
        return true
      }
      // Shift / Option / Alt + Enter → 换行，算作输入的一部分
      if (e.key === 'Enter' && (e.shiftKey || e.altKey)) {
        pendingInputRef.current += '\n'
        return true
      }
      return true
    })

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

    // 监听用户键盘输入，转发到 pty + 同步维护 pendingInput（用于 cmd+z 撤销）
    // 关键：识别 ESC 控制序列（方向键 \x1b[A、Home/End/PgUp 等）整段跳过，不清空 buffer，
    // 否则用户按一次方向键 cmd+z 就废了，体验崩溃
    const inputDisposable = terminal.onData((data) => {
      let i = 0
      while (i < data.length) {
        const ch = data[i]
        const code = ch.charCodeAt(0)
        // ESC 序列：\x1b 后跟 [ 或 O，再跟若干字符直到一个字母 / ~ 终止
        if (ch === '\x1b') {
          if (data[i + 1] === '[' || data[i + 1] === 'O') {
            let j = i + 2
            while (j < data.length && !/[A-Za-z~]/.test(data[j])) j++
            i = j + 1
            continue
          }
          i++ // 裸 ESC 也跳过
          continue
        }
        if (ch === '\x7f' || ch === '\b') {
          pendingInputRef.current = pendingInputRef.current.slice(0, -1)
        } else if (ch === '\r' || ch === '\n') {
          // 普通 Enter / Shift+Enter 已在 attachCustomKeyEventHandler 里处理
        } else if (code < 32 && ch !== '\t') {
          // 其它 Ctrl 字符（Ctrl+C / Ctrl+U / Ctrl+W 等）→ 静默跳过，不清空也不累计
          // 这样即使用户按了 Ctrl+W 删一个词，buffer 长度会偏大 N，但 cmd+z 多发的 backspace 会被 TUI 安全忽略
        } else {
          pendingInputRef.current += ch
        }
        i++
      }
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

  // 进入重命名模式时自动聚焦输入框
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renaming])

  // 处理关闭
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.(terminalId)
  }, [terminalId, onClose])

  // 处理点击激活
  const handleClick = useCallback(() => {
    onActivate?.(terminalId)
  }, [terminalId, onActivate])

  // 一键定位到最下方
  const handleScrollToBottom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      terminalRef.current?.scrollToBottom()
    } catch {}
  }, [])

  // 进入重命名
  const startRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!sessionId) return // 未绑定 session 不允许重命名
    setNameDraft(customName || '')
    setRenaming(true)
  }, [sessionId, customName])

  // 提交重命名
  const submitRename = useCallback(() => {
    setRenaming(false)
    const next = nameDraft.trim()
    if (next === (customName || '')) return
    onRename?.(terminalId, next)
  }, [terminalId, nameDraft, customName, onRename])

  // 取消重命名
  const cancelRename = useCallback(() => {
    setRenaming(false)
    setNameDraft(customName || '')
  }, [customName])

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
          {/* 标题 / 重命名输入框 */}
          {renaming ? (
            <input
              ref={renameInputRef}
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); submitRename() }
                if (e.key === 'Escape') { e.preventDefault(); cancelRename() }
              }}
              onBlur={submitRename}
              placeholder="Session 名称（空 = 清除）"
              className="flex-1 h-[22px] px-2 text-[11px] rounded-[4px] outline-none min-w-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border, rgba(218,119,86,0.5))',
                fontWeight: 590,
                maxWidth: '320px',
              }}
            />
          ) : (
            <>
              <span
                className="text-xs truncate cursor-text"
                onClick={startRename}
                onDoubleClick={startRename}
                style={{
                  color: customName ? 'var(--accent)' : (isActive ? 'var(--text-primary)' : 'var(--text-secondary)'),
                  fontWeight: customName ? 590 : (isActive ? 500 : 400),
                  fontSize: '11px',
                }}
                title={sessionId ? `${title}（点击重命名）` : title}
              >
                {title}
              </span>
              {/* 重命名图标按钮（仅当有 sessionId 时显示） */}
              {sessionId && (
                <button
                  onClick={startRename}
                  className="shrink-0 flex items-center justify-center rounded cursor-pointer opacity-0 group-hover:opacity-100"
                  style={{
                    width: '18px',
                    height: '18px',
                    color: 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                    opacity: 0.5,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    e.currentTarget.style.color = 'var(--accent)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.opacity = '0.5'
                  }}
                  title={customName ? '重命名' : '为这个 session 命名'}
                >
                  <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                  </svg>
                </button>
              )}
            </>
          )}
          {/* 项目名 */}
          {projectName && !renaming && (
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

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* 一键定位到底部按钮 */}
          <button
            onClick={handleScrollToBottom}
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
            title="跳到最新输出"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v10" />
              <path d="M3.5 8.5L8 13l4.5-4.5" />
              <path d="M3 14h10" />
            </svg>
          </button>

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
