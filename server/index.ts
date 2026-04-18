// Express 服务入口
import express from 'express'
import { loadAllSessions } from './sessions.js'
import { resumeSession } from './terminal.js'
import { applyLayout, getTerminalStatus } from './layout.js'
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

// API：获取当前终端窗口状态
app.get('/api/terminal-status', async (_req, res) => {
  try {
    const status = await getTerminalStatus()
    res.json(status)
  } catch (err) {
    console.error('获取终端状态失败:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: `获取终端状态失败: ${message}` })
  }
})

// 启动服务
app.listen(PORT, () => {
  console.log(`Session Manager API 运行在 http://localhost:${PORT}`)
})
