// 本地 HTTP server，接收 Claude Code hook 的通知请求
// 只绑定 127.0.0.1，不对外暴露
import http from 'http'

export type NotifyEventType = 'stop' | 'notify'

export interface NotifyEvent {
  event: NotifyEventType
  sessionId: string
  cwd?: string
  transcriptPath?: string
  raw?: any
}

type Listener = (ev: NotifyEvent) => void
const listeners = new Set<Listener>()

export function onNotify(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export const NOTIFY_PORT = 3458

export function startNotifyServer(): http.Server {
  const server = http.createServer((req, res) => {
    // 仅接受 localhost
    const remote = req.socket.remoteAddress || ''
    if (!remote.includes('127.0.0.1') && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
      res.writeHead(403); res.end('forbidden'); return
    }
    if (req.method === 'GET' && req.url === '/ccide/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true,"app":"ccIDE"}')
      return
    }
    if (req.method !== 'POST' || !req.url?.startsWith('/ccide/notify')) {
      res.writeHead(404); res.end(); return
    }
    const url = new URL(req.url, 'http://127.0.0.1')
    const event = (url.searchParams.get('e') as NotifyEventType) || 'notify'

    let body = ''
    req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy() })
    req.on('end', () => {
      let raw: any = {}
      try { raw = JSON.parse(body) } catch {}
      const sessionId =
        raw.session_id || raw.sessionId ||
        raw.hook_input?.session_id || ''
      listeners.forEach(l => {
        try {
          l({
            event,
            sessionId,
            cwd: raw.cwd,
            transcriptPath: raw.transcript_path,
            raw,
          })
        } catch {}
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
  })

  server.listen(NOTIFY_PORT, '127.0.0.1', () => {
    console.log(`[notify] listening on 127.0.0.1:${NOTIFY_PORT}`)
  })
  server.on('error', err => {
    console.warn(`[notify] server error:`, err)
  })
  return server
}
