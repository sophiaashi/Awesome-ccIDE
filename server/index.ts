// Express 服务入口
import express from 'express'
import { loadAllSessions, fullTextSearch, setSessionName, deleteSessionName } from './sessions.js'
import { resumeSession } from './terminal.js'
import { applyLayout, getTerminalStatus, focusWindow } from './layout.js'
import type { LayoutType } from './layout.js'

const app = express()
const PORT = 3457

app.use(express.json())

// API：获取所有 session 数据
app.get('/api/sessions', async (_req, res) => {
  try {
    const data = await loadAllSessions()
    res.json(data)
  } catch (err) {
    console.error('加载 session 数据失败:', err)
    res.status(500).json({ error: '无法加载 session 数据' })
  }
})

// API：设置/更新 session 自定义名称
app.put('/api/sessions/:sessionId/name', (req, res) => {
  try {
    const { sessionId } = req.params
    const { name } = req.body

    if (typeof name !== 'string') {
      res.status(400).json({ error: '缺少 name 参数' })
      return
    }

    if (name.trim()) {
      setSessionName(sessionId, name)
    } else {
      deleteSessionName(sessionId)
    }

    res.json({ success: true, name: name.trim() || null })
  } catch (err) {
    console.error('设置名称失败:', err)
    res.status(500).json({ error: '设置名称失败' })
  }
})

// API：全文搜索 — 搜索所有 session 历史记录中的用户输入
app.get('/api/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim()
    if (!query) {
      res.json({ results: {} })
      return
    }

    const matchMap = await fullTextSearch(query)
    // Map → plain object
    const results: Record<string, { text: string; highlight: string }[]> = {}
    for (const [sessionId, matches] of matchMap) {
      results[sessionId] = matches
    }

    res.json({ results })
  } catch (err) {
    console.error('搜索失败:', err)
    res.status(500).json({ error: '搜索失败' })
  }
})

// API：在新终端窗口中 resume 一个 session
app.post('/api/resume', async (req, res) => {
  try {
    const { sessionId, projectPath } = req.body

    // 参数校验
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: '缺少有效的 sessionId' })
      return
    }
    if (!projectPath || typeof projectPath !== 'string') {
      res.status(400).json({ error: '缺少有效的 projectPath' })
      return
    }

    const result = await resumeSession(sessionId, projectPath)
    res.json(result)
  } catch (err) {
    console.error('Resume session 失败:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: `无法打开终端: ${message}` })
  }
})

// API：设置终端窗口布局
app.post('/api/layout', async (req, res) => {
  try {
    const { layout } = req.body

    // 参数校验
    const validLayouts: LayoutType[] = ['quad', 'three-col', 'two-col', 'stack']
    if (!layout || !validLayouts.includes(layout)) {
      res.status(400).json({ error: '无效的布局类型，支持: quad, three-col, two-col, stack' })
      return
    }

    const result = await applyLayout(layout as LayoutType)
    res.json(result)
  } catch (err) {
    console.error('布局设置失败:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: `布局设置失败: ${message}` })
  }
})

// API：获取当前终端窗口状态（增强版：关联 session 数据）
app.get('/api/terminal-status', async (_req, res) => {
  try {
    const status = await getTerminalStatus()

    // 尝试将终端窗口关联到 session 数据
    try {
      const sessionData = await loadAllSessions()
      const sessionMap = new Map(
        sessionData.sessions.map(s => [s.sessionId, s])
      )

      // 为每个匹配到 sessionId 的终端窗口补充 session 信息
      for (const terminal of status.terminals) {
        if (terminal.sessionId && sessionMap.has(terminal.sessionId)) {
          const session = sessionMap.get(terminal.sessionId)!
          terminal.firstPrompt = session.firstPrompt
          terminal.summary = session.summary
          terminal.projectName = session.projectName
          terminal.projectPath = session.projectPath
        }
      }
    } catch {
      // session 数据加载失败不影响终端状态返回
    }

    res.json(status)
  } catch (err) {
    console.error('获取终端状态失败:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: `获取终端状态失败: ${message}` })
  }
})

// API：将指定终端窗口置顶
app.post('/api/focus-window', async (req, res) => {
  try {
    const { windowId, sessionId } = req.body

    // 参数校验：至少需要 windowId 或 sessionId 之一
    if ((!windowId || typeof windowId !== 'string') &&
        (!sessionId || typeof sessionId !== 'string')) {
      res.status(400).json({ error: '缺少有效的 windowId 或 sessionId' })
      return
    }

    const result = await focusWindow({ windowId, sessionId })
    res.json(result)
  } catch (err) {
    console.error('窗口置顶失败:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: `窗口置顶失败: ${message}` })
  }
})

// 启动服务
app.listen(PORT, () => {
  console.log(`Session Manager API 运行在 http://localhost:${PORT}`)
})
