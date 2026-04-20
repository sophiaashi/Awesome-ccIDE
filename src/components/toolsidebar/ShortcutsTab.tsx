// 快捷键 tab：内置 + 自定义 统一可增/删/改
// 存储：localStorage 里维护 deletedBuiltinIds / overrides / customs
// UI：按分组展示，每行 hover 显示 ✏️ 编辑 + 🗑 删除（二次确认）
import React, { useState, useEffect, useCallback, useMemo } from 'react'

interface Shortcut {
  id: string
  group: string
  keys: string[]   // 空数组 / ['🖱️'] 用来表示鼠标操作
  desc: string
}

type DisplayShortcut = Shortcut & { source: 'builtin' | 'custom' }

interface SavedState {
  version: number
  deletedBuiltinIds: string[]
  overrides: Record<string, Partial<Shortcut>>
  customs: Shortcut[]
}

// ========== 内置快捷键大全（升级时只加不删，id 保持稳定） ==========

const BUILTIN_VERSION = 1

const BUILTIN: Shortcut[] = [
  // 1. 进程控制
  { id: 'proc-ctrl-c', group: '🛑 进程控制', keys: ['Ctrl', 'C'], desc: '中断当前命令 / 取消正在输入的命令' },
  { id: 'proc-ctrl-c-x2', group: '🛑 进程控制', keys: ['Ctrl', 'C', '×2'], desc: '退出 Claude（双击 Ctrl+C，第一次会提示确认）' },
  { id: 'proc-ctrl-d', group: '🛑 进程控制', keys: ['Ctrl', 'D'], desc: '空输入时退出 shell / Claude；有输入时删除光标后一个字符' },
  { id: 'proc-ctrl-z', group: '🛑 进程控制', keys: ['Ctrl', 'Z'], desc: '把当前命令挂起到后台（用 fg 拉回）' },
  { id: 'proc-esc', group: '🛑 进程控制', keys: ['Esc'], desc: '中断 Claude 的回复（说错话时按一下打断）' },

  // 2. 复制粘贴 / 图片
  { id: 'cp-cmd-c', group: '✂️ 复制粘贴 / 图片', keys: ['⌘', 'C'], desc: '复制终端里选中的文字' },
  { id: 'cp-cmd-v', group: '✂️ 复制粘贴 / 图片', keys: ['⌘', 'V'], desc: '粘贴' },
  { id: 'cp-ctrl-v', group: '✂️ 复制粘贴 / 图片', keys: ['Ctrl', 'V'], desc: '把剪贴板里的图片发给 Claude（Claude Code 2.x 特有）' },
  { id: 'cp-drag', group: '✂️ 复制粘贴 / 图片', keys: ['🖱️'], desc: '鼠标拖拽选中一段文字' },
  { id: 'cp-dclick', group: '✂️ 复制粘贴 / 图片', keys: ['🖱️', '×2'], desc: '双击选中一个单词' },
  { id: 'cp-tclick', group: '✂️ 复制粘贴 / 图片', keys: ['🖱️', '×3'], desc: '三击选中整行' },

  // 3. Claude Code 专属
  { id: 'cc-shift-tab', group: '🎯 Claude Code 专属', keys: ['⇧', 'Tab'], desc: '切换模式：Normal ↔ Plan ↔ Bypass' },
  { id: 'cc-help', group: '🎯 Claude Code 专属', keys: ['/help'], desc: '看所有内置命令' },
  { id: 'cc-compact', group: '🎯 Claude Code 专属', keys: ['/compact'], desc: '压缩对话历史（上下文快满时用）' },
  { id: 'cc-clear', group: '🎯 Claude Code 专属', keys: ['/clear'], desc: '清空上下文重来' },
  { id: 'cc-resume', group: '🎯 Claude Code 专属', keys: ['/resume'], desc: '恢复之前的 session' },
  { id: 'cc-exit', group: '🎯 Claude Code 专属', keys: ['/exit'], desc: '退出' },
  { id: 'cc-config', group: '🎯 Claude Code 专属', keys: ['/config'], desc: '打开设置' },
  { id: 'cc-ide', group: '🎯 Claude Code 专属', keys: ['/ide'], desc: '连接到 VS Code / Cursor / 其他 IDE' },
  { id: 'cc-hash', group: '🎯 Claude Code 专属', keys: ['#'], desc: '输入以 # 开头的消息 → 快速往 CLAUDE.md 加一条规则' },

  // 4. 光标移动
  { id: 'cur-ctrl-a', group: '🖱️ 光标移动（输入框里）', keys: ['Ctrl', 'A'], desc: '跳到行首' },
  { id: 'cur-ctrl-e', group: '🖱️ 光标移动（输入框里）', keys: ['Ctrl', 'E'], desc: '跳到行尾' },
  { id: 'cur-opt-left', group: '🖱️ 光标移动（输入框里）', keys: ['⌥', '←'], desc: '按单词往左跳' },
  { id: 'cur-opt-right', group: '🖱️ 光标移动（输入框里）', keys: ['⌥', '→'], desc: '按单词往右跳' },
  { id: 'cur-cmd-left', group: '🖱️ 光标移动（输入框里）', keys: ['⌘', '←'], desc: '跳到行首（macOS 习惯）' },
  { id: 'cur-cmd-right', group: '🖱️ 光标移动（输入框里）', keys: ['⌘', '→'], desc: '跳到行尾' },

  // 5. 快速删除
  { id: 'del-ctrl-u', group: '🗑️ 快速删除', keys: ['Ctrl', 'U'], desc: '清空光标前所有内容（输错一半想重写时超好用）' },
  { id: 'del-ctrl-k', group: '🗑️ 快速删除', keys: ['Ctrl', 'K'], desc: '清空光标后所有内容' },
  { id: 'del-ctrl-w', group: '🗑️ 快速删除', keys: ['Ctrl', 'W'], desc: '删除光标前一个单词' },
  { id: 'del-opt-back', group: '🗑️ 快速删除', keys: ['⌥', 'Delete'], desc: '删除前一个单词（macOS 习惯）' },
  { id: 'del-ctrl-h', group: '🗑️ 快速删除', keys: ['Ctrl', 'H'], desc: '删一个字符（= Backspace）' },

  // 6. 历史命令
  { id: 'his-up', group: '📜 历史命令（shell 里）', keys: ['↑'], desc: '上一条历史命令' },
  { id: 'his-down', group: '📜 历史命令（shell 里）', keys: ['↓'], desc: '下一条历史命令' },
  { id: 'his-ctrl-r', group: '📜 历史命令（shell 里）', keys: ['Ctrl', 'R'], desc: '反向搜索历史命令（打字就筛，找之前跑过的命令神器）' },
  { id: 'his-bang-bang', group: '📜 历史命令（shell 里）', keys: ['!!'], desc: '重复上一条命令' },
  { id: 'his-bang-prefix', group: '📜 历史命令（shell 里）', keys: ['!npm'], desc: '重复最近以 npm 开头的命令（换成你想要的前缀）' },

  // 7. 屏幕控制
  { id: 'scr-ctrl-l', group: '🖼️ 屏幕控制', keys: ['Ctrl', 'L'], desc: '清屏（内容还在 scrollback，往上滚还能看）' },
  { id: 'scr-cmd-k', group: '🖼️ 屏幕控制', keys: ['⌘', 'K'], desc: 'Terminal 专属：真清屏 + 清历史' },
  { id: 'scr-shift-pgup', group: '🖼️ 屏幕控制', keys: ['⇧', 'PgUp'], desc: '往上翻页' },
  { id: 'scr-shift-pgdn', group: '🖼️ 屏幕控制', keys: ['⇧', 'PgDn'], desc: '往下翻页' },

  // 8. ccIDE 自己的
  { id: 'cci-cmd-k', group: '🧭 ccIDE 自己的', keys: ['⌘', 'K'], desc: '聚焦 Session 搜索框' },
  { id: 'cci-arrows', group: '🧭 ccIDE 自己的', keys: ['↑', '↓'], desc: 'Session 列表上下选择' },
  { id: 'cci-enter', group: '🧭 ccIDE 自己的', keys: ['Enter'], desc: 'Resume 选中的 session' },
  { id: 'cci-cmd-num', group: '🧭 ccIDE 自己的', keys: ['⌘', '1~9'], desc: '跳到第 N 个 terminal' },
  { id: 'cci-ctrl-tab', group: '🧭 ccIDE 自己的', keys: ['Ctrl', 'Tab'], desc: '下一个 terminal（循环）' },
  { id: 'cci-ctrl-shift-tab', group: '🧭 ccIDE 自己的', keys: ['Ctrl', '⇧', 'Tab'], desc: '上一个 terminal' },
  { id: 'cci-cmd-s', group: '🧭 ccIDE 自己的', keys: ['⌘', 'S'], desc: '保存 CLAUDE.md（编辑模式下）' },
  { id: 'cci-cmd-q', group: '🧭 ccIDE 自己的', keys: ['⌘', 'Q'], desc: '完全退出 ccIDE' },
  { id: 'cci-cmd-w', group: '🧭 ccIDE 自己的', keys: ['⌘', 'W'], desc: '关窗口（保持后台）' },
  { id: 'cci-cmd-m', group: '🧭 ccIDE 自己的', keys: ['⌘', 'M'], desc: '最小化' },
  { id: 'cci-cmd-h', group: '🧭 ccIDE 自己的', keys: ['⌘', 'H'], desc: '隐藏 ccIDE' },
]

// ========== 存储 ==========

const STORAGE_KEY = 'ccide-shortcuts-state'

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return {
        version: s.version || 0,
        deletedBuiltinIds: s.deletedBuiltinIds || [],
        overrides: s.overrides || {},
        customs: s.customs || [],
      }
    }
  } catch {}
  return { version: 0, deletedBuiltinIds: [], overrides: {}, customs: [] }
}

function saveState(s: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, version: BUILTIN_VERSION }))
}

/** 合并内置 + 用户数据得到最终展示列表 */
function merge(state: SavedState): DisplayShortcut[] {
  const out: DisplayShortcut[] = []
  const deleted = new Set(state.deletedBuiltinIds)
  for (const b of BUILTIN) {
    if (deleted.has(b.id)) continue
    const ov = state.overrides[b.id] || {}
    out.push({ ...b, ...ov, source: 'builtin' })
  }
  for (const c of state.customs) {
    out.push({ ...c, source: 'custom' })
  }
  return out
}

// ========== 按键归一化（复用之前的） ==========

function parseKeys(input: string): string[] {
  return input.split(/[+,\s]+/).map(k => k.trim()).filter(Boolean).map(normalizeKey)
}

function normalizeKey(k: string): string {
  const lower = k.toLowerCase()
  const map: Record<string, string> = {
    cmd: '⌘', command: '⌘', meta: '⌘',
    ctrl: 'Ctrl', control: 'Ctrl',
    shift: '⇧', alt: '⌥', option: '⌥', opt: '⌥',
    enter: 'Enter', return: 'Enter',
    esc: 'Esc', escape: 'Esc', tab: 'Tab',
    up: '↑', down: '↓', left: '←', right: '→',
    space: 'Space', del: 'Delete', delete: 'Delete',
    backspace: 'Backspace',
    pgup: 'PgUp', pgdn: 'PgDn',
  }
  if (map[lower]) return map[lower]
  if (k.length === 1) return k.toUpperCase()
  return k
}

function genId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ========== 主组件 ==========

export function ShortcutsTab() {
  const [state, setState] = useState<SavedState>(loadState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // 添加 / 编辑 表单
  const [form, setForm] = useState<{ group: string; keys: string; desc: string }>({ group: '', keys: '', desc: '' })
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => { saveState(state) }, [state])

  const list = useMemo(() => merge(state), [state])

  // 按 group 分组（保持内置分组顺序）
  const groups = useMemo(() => {
    const map = new Map<string, DisplayShortcut[]>()
    // 先按 BUILTIN 里的 group 顺序占位
    const order: string[] = []
    for (const b of BUILTIN) {
      if (!map.has(b.group)) { map.set(b.group, []); order.push(b.group) }
    }
    for (const s of list) {
      if (!map.has(s.group)) { map.set(s.group, []); order.push(s.group) }
      map.get(s.group)!.push(s)
    }
    return order.filter(g => map.get(g)?.length).map(g => ({ group: g, items: map.get(g)! }))
  }, [list])

  // ========== 操作 ==========

  const startEdit = useCallback((s: DisplayShortcut) => {
    setEditingId(s.id)
    setAddingNew(false)
    setForm({ group: s.group, keys: s.keys.join(' + '), desc: s.desc })
  }, [])

  const startAdd = useCallback(() => {
    setAddingNew(true)
    setEditingId(null)
    setForm({ group: '我的快捷键', keys: '', desc: '' })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setAddingNew(false)
  }, [])

  const submitForm = useCallback(() => {
    const keys = parseKeys(form.keys)
    const desc = form.desc.trim()
    const group = form.group.trim() || '我的快捷键'
    if (keys.length === 0 || !desc) return

    if (addingNew) {
      setState(s => ({
        ...s,
        customs: [...s.customs, { id: genId(), group, keys, desc }],
      }))
    } else if (editingId) {
      setState(s => {
        // 判断是内置还是自定义
        const isBuiltin = BUILTIN.some(b => b.id === editingId)
        if (isBuiltin) {
          return {
            ...s,
            overrides: { ...s.overrides, [editingId]: { group, keys, desc } },
          }
        } else {
          return {
            ...s,
            customs: s.customs.map(c => c.id === editingId ? { ...c, group, keys, desc } : c),
          }
        }
      })
    }
    cancelEdit()
  }, [form, addingNew, editingId, cancelEdit])

  const doDelete = useCallback((s: DisplayShortcut) => {
    if (pendingDeleteId !== s.id) {
      setPendingDeleteId(s.id)
      setTimeout(() => setPendingDeleteId(prev => prev === s.id ? null : prev), 4000)
      return
    }
    setPendingDeleteId(null)
    setState(state => {
      if (s.source === 'builtin') {
        return { ...state, deletedBuiltinIds: [...state.deletedBuiltinIds, s.id] }
      } else {
        return { ...state, customs: state.customs.filter(c => c.id !== s.id) }
      }
    })
  }, [pendingDeleteId])

  const resetDefaults = useCallback(() => {
    if (!confirm('恢复所有内置默认快捷键？\n\n这会清空你对内置快捷键的删除和修改，但保留自定义快捷键。')) return
    setState(s => ({ ...s, deletedBuiltinIds: [], overrides: {} }))
  }, [])

  // ========== 渲染 ==========

  const hasOverrides = Object.keys(state.overrides).length > 0 || state.deletedBuiltinIds.length > 0

  return (
    <div className="h-full overflow-y-auto px-3 pt-2 pb-4">
      {groups.map(({ group, items }) => (
        <div key={group} className="mt-3 first:mt-0">
          <div
            className="text-[11px] font-[590] mb-1.5 px-1 flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>{group}</span>
            <span className="text-[9px] font-[400]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              ({items.length})
            </span>
          </div>
          {items.map(s => (
            editingId === s.id ? (
              <EditForm
                key={s.id}
                form={form}
                onChange={setForm}
                onSubmit={submitForm}
                onCancel={cancelEdit}
              />
            ) : (
              <Row
                key={s.id}
                shortcut={s}
                confirming={pendingDeleteId === s.id}
                onEdit={() => startEdit(s)}
                onDelete={() => doDelete(s)}
              />
            )
          ))}
        </div>
      ))}

      {/* 添加按钮 */}
      <div className="mt-4">
        {addingNew ? (
          <EditForm
            form={form}
            onChange={setForm}
            onSubmit={submitForm}
            onCancel={cancelEdit}
          />
        ) : (
          <button
            onClick={startAdd}
            className="w-full text-[11px] font-[510] py-1.5 rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            + 添加自定义快捷键
          </button>
        )}
      </div>

      {/* 恢复默认（仅当有改动时显示） */}
      {hasOverrides && (
        <button
          onClick={resetDefaults}
          className="w-full text-[10px] mt-2 py-1 rounded-md cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
          title="清空对内置快捷键的删除/修改，保留自定义的"
        >
          ↻ 恢复所有内置默认
        </button>
      )}
    </div>
  )
}

// ========== 子组件 ==========

function Row({
  shortcut,
  confirming,
  onEdit,
  onDelete,
}: {
  shortcut: DisplayShortcut
  confirming: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group flex items-center justify-between gap-2 py-1.5 px-2 rounded-md transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {shortcut.desc}
        {shortcut.source === 'custom' && (
          <span className="ml-1 text-[9px]" style={{ color: 'var(--accent)', opacity: 0.7 }}>●</span>
        )}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {shortcut.keys.map((k, ki) => (
          <React.Fragment key={ki}>
            {ki > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>+</span>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </div>
      {/* hover 按钮 */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="w-5 h-5 flex items-center justify-center rounded-[3px] cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="编辑"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 h-5 px-1 rounded-[3px] cursor-pointer text-[9px] font-[510]"
          style={{
            color: confirming ? '#fff' : 'var(--text-muted)',
            background: confirming ? 'var(--accent)' : 'transparent',
          }}
          title={confirming ? '再点一次删除' : '删除'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          {confirming && <span>确认？</span>}
        </button>
      </div>
    </div>
  )
}

function EditForm({
  form, onChange, onSubmit, onCancel,
}: {
  form: { group: string; keys: string; desc: string }
  onChange: (f: { group: string; keys: string; desc: string }) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="p-2 rounded-md mb-1"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <FormField label="分组" value={form.group} onChange={v => onChange({ ...form, group: v })} placeholder="🛑 进程控制" />
      <FormField
        label="按键" value={form.keys} onChange={v => onChange({ ...form, keys: v })}
        placeholder="如：cmd+shift+t 或 ctrl+c 或 !!"
        hint="用 + 或空格分隔；支持 cmd/ctrl/shift/alt/enter/esc/tab/↑↓"
      />
      <FormField label="说明" value={form.desc} onChange={v => onChange({ ...form, desc: v })} placeholder="做什么用" />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onSubmit}
          disabled={!form.keys.trim() || !form.desc.trim()}
          className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
          style={{
            background: 'var(--accent)', color: '#fff',
            opacity: (!form.keys.trim() || !form.desc.trim()) ? 0.4 : 1,
          }}
        >保存</button>
        <button
          onClick={onCancel}
          className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >取消</button>
        {form.keys.trim() && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>预览</span>
            {parseKeys(form.keys).map((k, ki) => (
              <React.Fragment key={ki}>
                {ki > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>+</span>}
                <Kbd>{k}</Kbd>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="text-[11px] font-[510] px-1.5 py-[1px] rounded-[3px] tabular-nums"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        fontFamily: "'SF Mono', monospace",
        minWidth: '20px',
        textAlign: 'center',
      }}
    >
      {children}
    </kbd>
  )
}

function FormField({
  label, value, onChange, placeholder, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="mb-1.5">
      <label className="text-[10px] font-[510]" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-6 px-2 mt-0.5 rounded-[4px] text-[12px] outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
      {hint && (
        <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</div>
      )}
    </div>
  )
}
