// 键盘导航 hook
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseKeyboardReturn {
  /** 当前选中的索引（-1 表示未选中） */
  selectedIndex: number
  /** 设置选中索引 */
  setSelectedIndex: (index: number) => void
  /** 搜索框 ref */
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

interface UseKeyboardOptions {
  /** 列表项总数 */
  itemCount: number
  /** 按 Enter 时的回调 */
  onEnter?: (index: number) => void
}

/**
 * 键盘导航 hook
 * 支持 ⌘K 聚焦搜索框、↑↓ 导航列表、Enter 确认
 */
export function useKeyboard({ itemCount, onEnter }: UseKeyboardOptions): UseKeyboardReturn {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // 当列表项数量变化时，重置选中索引
  useEffect(() => {
    setSelectedIndex(-1)
  }, [itemCount])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ⌘K 聚焦搜索框
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchInputRef.current?.focus()
      return
    }

    // ↑ 键：向上移动
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => {
        if (prev <= 0) return itemCount - 1 // 回到底部
        return prev - 1
      })
      return
    }

    // ↓ 键：向下移动
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => {
        if (prev >= itemCount - 1) return 0 // 回到顶部
        return prev + 1
      })
      return
    }

    // Enter 键：确认选中
    if (e.key === 'Enter' && selectedIndex >= 0 && onEnter) {
      e.preventDefault()
      onEnter(selectedIndex)
      return
    }

    // Escape 键：清空搜索框
    if (e.key === 'Escape') {
      searchInputRef.current?.blur()
      return
    }
  }, [itemCount, selectedIndex, onEnter])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    selectedIndex,
    setSelectedIndex,
    searchInputRef,
  }
}
