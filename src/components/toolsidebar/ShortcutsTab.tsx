// 快捷键 tab：硬编码当前 ccIDE 支持的所有快捷键
import React from 'react'

interface ShortcutGroup {
  title: string
  items: { keys: string[]; desc: string }[]
}

const GROUPS: ShortcutGroup[] = [
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
    title: '其他（macOS 通用）',
    items: [
      { keys: ['⌘', 'Q'], desc: '完全退出 ccIDE' },
      { keys: ['⌘', 'W'], desc: '关闭窗口（保持后台）' },
      { keys: ['⌘', 'M'], desc: '最小化窗口' },
      { keys: ['⌘', 'H'], desc: '隐藏 ccIDE' },
    ],
  },
]

export function ShortcutsTab() {
  return (
    <div className="h-full overflow-y-auto px-3 pt-2 pb-4">
      {GROUPS.map((g, i) => (
        <div key={g.title} className={i === 0 ? '' : 'mt-4'}>
          <div
            className="text-[10px] font-[510] uppercase tracking-wider mb-1.5 px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {g.title}
          </div>
          {g.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {item.desc}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, ki) => (
                  <React.Fragment key={ki}>
                    {ki > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>+</span>}
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
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
