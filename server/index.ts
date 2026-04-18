// Express 服务入口
import express from 'express'
import { loadAllSessions } from './sessions.js'

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

// 启动服务
app.listen(PORT, () => {
  console.log(`Session Manager API 运行在 http://localhost:${PORT}`)
})
