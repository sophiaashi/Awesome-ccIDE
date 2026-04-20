// 快捷键 tab：内置组（只读）+ 自定义组（可增可删，localStorage 持久化）
import React, { useState, useEffect, useCallback } from 'react'

interface ShortcutItem {
  keys: string[]
  desc: string
}

interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

interface CustomShortcut {
  id: string
  group: string
  keys: string[]
  desc: string
}

const BUILTIN_GROUPS: ShortcutGroup[] = [
  {
    title: 'Session 列表',
    items: [
      { keys: ['⌘', 'K'], desc: '聚焦搜索框' },
      { keys: ['↑'], desc: '向上选择' },
      { keys: ['↓'], desc: '向下选择' },
      { keys: ['Enter'], desc: 'Resume 选中的 session' },
      { keys: ['Esc'], desc: '取消搜索框焦点' },
    ],
  },
  {
    title: '终端 Tab 切换',
    items: [
      { keys: ['⌘', '1'], desc: '跳到第 1 个 terminal' },
      { keys: ['⌘', '2~9'], desc: '跳到第 N 个 terminal' },
      { keys: ['⌃', 'Tab'], desc: '下一个 terminal（循环）' },
      { keys: ['⌃', '⇧', 'Tab'], desc: '上一个 terminal（循环）' },
    ],
  },
  {
    title: 'CLAUDE.md 编辑',
    items: [
      { keys: ['⌘', 'S'], desc: '保存（编辑模式下）' },
      { keys: ['Esc'], desc: '取消编辑' },
    ],
  },
  {
    title: '其他（macOS 通用）',
    items: [
      { keys: ['⌘', 'Q'], desc: '完全退出 ccIDE' },
      { keys: ['⌘', 'W'], desc: '关闭窗口（保持后台）' },
      { keys: ['⌘', 'M'], desc: '最小化窗口' },
      { keys: ['⌘', 'H'], desc: '隐藏 ccIDE' },
    ],
  },
]

const STORAGE_KEY = 'ccide-custom-shortcuts'

function loadCustom(): CustomShortcut[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCustom(list: CustomShortcut[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function parseKeys(input: string): string[] {
  // 支持用户输入 "cmd+shift+t"、"⌘+⇧+T"、"ctrl tab" 等
  return input
    .split(/[+,\s]+/)
    .map(k => k.trim())
    .filter(Boolean)
    .map(normalizeKey)
}

function normalizeKey(k: string): string {
  const lower = k.toLowerCase()
  const map: Record<string, string> = {
    cmd: '⌘', command: '⌘', meta: '⌘',
    ctrl: '⌃', control: '⌃',
    shift: '⇧', alt: '⌥', option: '⌥', opt: '⌥',
    enter: 'Enter', return: 'Enter',
    esc: 'Esc', escape: 'Esc', tab: 'Tab',
    up: '↑', down: '↓', left: '←', right: '→',
    space: 'Space',
  }
  if (map[lower]) return map[lower]
  if (k.length === 1) return k.toUpperCase()
  return k
}

export function ShortcutsTab() {
  const [customs, setCustoms] = useState<CustomShortcut[]>(loadCustom)
  const [adding, setAdding] = useState(false)
  const [formGroup, setFormGroup] = useState('我的快捷键')
  const [formKeys, setFormKeys] = useState('')
  const [formDesc, setFormDesc] = useState('')

  useEffect(() => { saveCustom(customs) }, [customs])

  const resetForm = useCallback(() => {
    setFormGroup('我的快捷键')
    setFormKeys('')
    setFormDesc('')
    setAdding(false)
  }, [])

  const addShortcut = useCallback(() => {
    const keys = parseKeys(formKeys)
    const desc = formDesc.trim()
    const group = formGroup.trim() || '我的快捷键'
    if (keys.length === 0 || !desc) return
    setCustoms(list => [...list, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      group, keys, desc,
    }])
    resetForm()
  }, [formKeys, formDesc, formGroup, resetForm])

  const removeShortcut = useCallback((id: string) => {
    setCustoms(list => list.filter(s => s.id !== id))
  }, [])

  // 按 group 聚合自定义
  const customGroups: Record<string, CustomShortcut[]> = {}
  for (const s of customs) {
    if (!customGroups[s.group]) customGroups[s.group] = []
    customGroups[s.group].push(s)
  }

  return (
    <div className="h-full overflow-y-auto px-3 pt-2 pb-4">
      {/* 内置分组 */}
      {BUILTIN_GROUPS.map((g, i) => (
        <div key={g.title} className={i === 0 ? '' : 'mt-4'}>
          <GroupHeader label={g.title} />
          {g.items.map((item, idx) => (
            <Row key={idx} keys={item.keys} desc={item.desc} />
          ))}
        </div>
      ))}

      {/* 自定义分组 */}
      {Object.entries(customGroups).map(([group, items]) => (
        <div key={group} className="mt-4">
          <GroupHeader label={group} custom />
          {items.map(s => (
            <Row key={s.id} keys={s.keys} desc={s.desc} onRemove={() => removeShortcut(s.id)} />
          ))}
        </div>
      ))}

      {/* 添加表单 / 按钮 */}
      <div className="mt-4">
        {adding ? (
          <div
            className="p-2 rounded-md"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <FormField label="分组" value={formGroup} onChange={setFormGroup} placeholder="我的快捷键" />
            <FormField
              label="按键" value={formKeys} onChange={setFormKeys}
              placeholder="如：cmd+shift+t 或 ctrl+tab"
              hint="用 + 或空格分隔；支持 cmd/ctrl/shift/alt/enter/esc/tab/↑↓←→"
            />
            <FormField label="说明" value={formDesc} onChange={setFormDesc} placeholder="做什么用" />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={addShortcut}
                disabled={!formKeys.trim() || !formDesc.trim()}
                className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
                style={{
                  background: 'var(--accent)', color: '#fff',
                  opacity: (!formKeys.trim() || !formDesc.trim()) ? 0.4 : 1,
                }}
              >添加</button>
              <button
                onClick={resetForm}
                className="text-[11px] font-[510] px-2 h-6 rounded-md cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >取消</button>
              {formKeys.trim() && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>预览</span>
                  {parseKeys(formKeys).map((k, ki) => (
                    <React.Fragment key={ki}>
                      {ki > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>+</span>}
                      <Kbd>{k}</Kbd>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-[11px] font-[510] py-1.5 rounded-md cursor-pointer transition-colors"
            style={{
              color: 'var(--text-muted)',
              border: '1px dashed var(--border)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            + 添加自定义快捷键
          </button>
        )}
      </div>
    </div>
  )
}

function GroupHeader({ label, custom }: { label: string; custom?: boolean }) {
  return (
    <div
      className="text-[10px] font-[510] uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1"
      style={{ color: custom ? 'var(--accent)' : 'var(--text-muted)' }}
    >
      {label}
      {custom && <span style={{ fontSize: '8px', opacity: 0.7 }}>（自定义）</span>}
    </div>
  )
}

function Row({ keys, desc, onRemove }: { keys: string[]; desc: string; onRemove?: () => void }) {
  return (
    <div
      className="group flex items-center justify-between gap-2 py-1.5 px-2 rounded-md"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {desc}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, ki) => (
          <React.Fragment key={ki}>
            {ki > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>+</span>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 ml-1 w-5 h-5 flex items-center justify-center rounded-[3px] cursor-pointer transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          title="删除"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
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
