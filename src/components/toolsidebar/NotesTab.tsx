// 备忘录 tab：markdown 自由编辑 + 顶部 TODO 提取视图
// 自动保存到 ~/.claude-session-manager/notes.md（500ms 防抖）
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

interface TodoItem {
  lineIndex: number   // 在 content.split('\n') 里的行号
  checked: boolean
  text: string
  indent: string      // 前导空白
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function extractTodos(content: string): TodoItem[] {
  const todos: TodoItem[] = []
  const lines = content.split('\n')
  const re = /^(\s*)- \[( |x|X)\] (.*)$/
  lines.forEach((line, i) => {
    const m = line.match(re)
    if (m) {
      todos.push({
        lineIndex: i,
        indent: m[1],
        checked: m[2].toLowerCase() === 'x',
        text: m[3],
      })
    }
  })
  return todos
}

/** 切换指定行的 [ ] ↔ [x] */
function toggleTodoInContent(content: string, lineIndex: number): string {
  const lines = content.split('\n')
  const line = lines[lineIndex]
  if (!line) return content
  lines[lineIndex] = line.replace(/- \[( |x|X)\]/, (_, c) => {
    return c === ' ' ? '- [x]' : '- [ ]'
  })
  return lines.join('\n')
}

export function NotesTab() {
  const [content, setContent] = useState<string>('')
  const [filePath, setFilePath] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [todosCollapsed, setTodosCollapsed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)

  // 初次加载
  useEffect(() => {
    window.electronAPI.tools.loadNotes().then(r => {
      setContent(r.content)
      setFilePath(r.path)
      setLoading(false)
      loadedRef.current = true
    })
  }, [])

  // 防抖自动保存
  const scheduleSave = useCallback((next: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setStatus('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await window.electronAPI.tools.saveNotes(next)
        if (r.success) {
          setStatus('saved')
          setTimeout(() => setStatus(prev => prev === 'saved' ? 'idle' : prev), 1200)
        } else {
          setErrorMsg(r.error || '保存失败')
          setStatus('error')
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '未知错误')
        setStatus('error')
      }
    }, 500)
  }, [])

  const updateContent = useCallback((next: string) => {
    setContent(next)
    if (loadedRef.current) scheduleSave(next)
  }, [scheduleSave])

  // 退出 tab 时 flush 一次（避免 500ms 内切走丢数据）
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        // 最后一次立即保存
        window.electronAPI.tools.saveNotes(content).catch(() => {})
      }
    }
  }, [content])

  const todos = useMemo(() => extractTodos(content), [content])
  const doneCount = todos.filter(t => t.checked).length

  const toggleTodo = useCallback((lineIndex: number) => {
    const next = toggleTodoInContent(content, lineIndex)
    updateContent(next)
  }, [content, updateContent])

  /** 点 TODO 文本：滚动到对应行 + 聚焦 textarea */
  const scrollToLine = useCallback((lineIndex: number) => {
    const ta = textareaRef.current
    if (!ta) return
    const lines = content.split('\n')
    let offset = 0
    for (let i = 0; i < lineIndex; i++) offset += lines[i].length + 1
    const lineLen = lines[lineIndex]?.length || 0
    ta.focus()
    ta.setSelectionRange(offset, offset + lineLen)
  }, [content])

  const placeholder = `在这里写备忘录，支持 markdown。
自动保存。

TODO 示例（- [ ] 或 - [x]，上方会显示可点击的列表）：
- [ ] 联系 HR 吴宇鹏
- [x] 修 channel-sync 卡死
- [ ] 把 GROWTH.md 里的动作排日程
`

  return (
    <div className="flex flex-col h-full">
      {/* 顶部：状态栏 */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-1.5 pt-1 text-[11px]">
        <span style={{ color: 'var(--text-muted)' }}>
          {todos.length > 0 ? (
            <>TODO <b style={{ color: 'var(--text-secondary)' }}>{doneCount}/{todos.length}</b></>
          ) : '📒 笔记'}
        </span>
        <div className="flex-1" />
        {status === 'saving' && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>保存中...</span>}
        {status === 'saved' && <span className="text-[10px] font-[510]" style={{ color: 'var(--success, #3FB950)' }}>✓ 已保存</span>}
        {status === 'error' && (
          <span className="text-[10px] font-[510] truncate max-w-[140px]" style={{ color: 'var(--accent)' }} title={errorMsg}>
            {errorMsg || '失败'}
          </span>
        )}
      </div>

      {/* TODO 快速视图 */}
      {todos.length > 0 && (
        <div
          className="shrink-0 mx-3 mb-2 rounded-md"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setTodosCollapsed(v => !v)}
            className="w-full flex items-center gap-1 px-2 py-1 cursor-pointer text-[10px] font-[510]"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: todosCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              <path d="M4 6l4 4 4-4" strokeLinecap="round" />
            </svg>
            <span>任务列表</span>
          </button>
          {!todosCollapsed && (
            <div className="px-2 pb-2 space-y-0.5 max-h-[40vh] overflow-y-auto">
              {todos.map((t) => (
                <div
                  key={t.lineIndex}
                  className="flex items-start gap-1.5 text-[12px] leading-[1.35] group"
                >
                  <button
                    onClick={() => toggleTodo(t.lineIndex)}
                    className="shrink-0 mt-[2px] w-3.5 h-3.5 flex items-center justify-center rounded-[3px] cursor-pointer"
                    style={{
                      border: `1.5px solid ${t.checked ? 'var(--accent)' : 'var(--text-muted)'}`,
                      background: t.checked ? 'var(--accent)' : 'transparent',
                    }}
                    title={t.checked ? '标记为未完成' : '标记为完成'}
                  >
                    {t.checked && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span
                    onClick={() => scrollToLine(t.lineIndex)}
                    className="flex-1 cursor-pointer truncate"
                    style={{
                      color: t.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: t.checked ? 'line-through' : 'none',
                    }}
                    title={t.text + '\n\n点击跳到编辑位置'}
                  >
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 主编辑区 */}
      <div className="flex-1 min-h-0 px-3 pb-2">
        {loading ? (
          <div className="text-[12px] pt-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中…</div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => updateContent(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="w-full h-full outline-none resize-none text-[12.5px]"
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1.55,
              fontFamily: "-apple-system, 'SF Pro Text', 'PingFang SC', sans-serif",
              background: 'var(--bg-tertiary)',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}
          />
        )}
      </div>

      {/* 底部：文件路径 */}
      <div className="shrink-0 px-3 pb-2 text-[9px] truncate" style={{ color: 'var(--text-muted)', fontFamily: "'SF Mono', monospace" }}>
        {filePath ? filePath.replace(/^\/Users\/[^/]+/, '~') : ''}
      </div>
    </div>
  )
}
