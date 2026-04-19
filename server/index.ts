// Express 服务 — 开发模式 fallback（Electron 不可用时使用）
import express from 'express'
import { loadAllSessions, fullTextSearch, setSessionName, deleteSessionName } from './sessions.js'

const app = express()
const PORT = 3457

app.use(express.json())

app.get('/api/sessions', async (_req, res) => {
  try { res.json(await loadAllSessions()) }
  catch (err) { res.status(500).json({ error: '加载失败' }) }
})

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim()
    if (!q) { res.json({ results: {} }); return }
    const m = await fullTextSearch(q)
    const results: Record<string, any[]> = {}
    for (const [k, v] of m) results[k] = v
    res.json({ results })
  } catch { res.status(500).json({ error: '搜索失败' }) }
})

app.put('/api/sessions/:sessionId/name', (req, res) => {
  try {
    const { name } = req.body
    if (typeof name !== 'string') { res.status(400).json({ error: '缺少 name' }); return }
    name.trim() ? setSessionName(req.params.sessionId, name) : deleteSessionName(req.params.sessionId)
    res.json({ success: true })
  } catch { res.status(500).json({ error: '设置失败' }) }
})

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
