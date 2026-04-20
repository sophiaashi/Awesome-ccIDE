// 终端 Tab 切换快捷键
// - ⌘1 ~ ⌘9：跳到第 N 个 terminal
// - ⌃+Tab：下一个 terminal
// - ⌃+⇧+Tab：上一个 terminal
import { useEffect } from 'react'
import type { TerminalInfo } from '../types/session'

interface UseTabShortcutsOptions {
  terminals: TerminalInfo[]
  activeTerminalId: string | null
  onActivate: (terminalId: string) => void
}

export function useTabShortcuts({
  terminals,
  activeTerminalId,
  onActivate,
}: UseTabShortcutsOptions) {
  useEffect(() => {
    if (terminals.length === 0) return

    const handler = (e: KeyboardEvent) => {
      // ⌘1 ~ ⌘9：跳到第 N 个 terminal（1-indexed）
      if (
        e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        /^[1-9]$/.test(e.key)
      ) {
        const index = parseInt(e.key, 10) - 1
        if (index < terminals.length) {
          e.preventDefault()
          e.stopPropagation()
          onActivate(terminals[index].terminalId)
        }
        return
      }

      // ⌃+Tab / ⌃+⇧+Tab：循环切换
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        const currentIdx = terminals.findIndex(
          t => t.terminalId === activeTerminalId,
        )
        const start = currentIdx < 0 ? 0 : currentIdx
        const next = e.shiftKey
          ? (start - 1 + terminals.length) % terminals.length
          : (start + 1) % terminals.length
        onActivate(terminals[next].terminalId)
        return
      }
    }

    // capture 阶段拦截，比 xterm 的 textarea handler 更早触发
    document.addEventListener('keydown', handler, true)
    return () => {
      document.removeEventListener('keydown', handler, true)
    }
  }, [terminals, activeTerminalId, onActivate])
}
