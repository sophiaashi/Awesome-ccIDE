# Dev Server 信息

## 启动命令

```bash
cd ~/claude-session-manager
npm run dev
```

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Vite Dev Server | 3456 | 前端入口，浏览器打开此地址 |
| Express API | 3457 | 后端 API，Vite 自动代理 /api 到此 |

## 访问地址

- 前端页面：http://localhost:3456
- API 接口（通过 Vite proxy）：
  - `GET /api/sessions` — 获取所有 session 数据
  - `POST /api/resume` — 在新终端窗口中 resume 一个 session

## API 详情

### GET /api/sessions
返回所有 session 列表、项目列表、总数、homedir。

### POST /api/resume
请求体：`{ "sessionId": "xxx", "projectPath": "/path/to/project" }`
响应：`{ "success": true, "terminal": "Terminal.app" | "iTerm2" }`
功能：自动检测终端应用（Terminal.app / iTerm2），通过 AppleScript 打开新窗口并执行 `cd + claude --resume`。

## 启动流程

`npm run dev` 使用 concurrently 同时启动：
1. `tsx watch server/index.ts` — Express 后端（端口 3457）
2. `vite` — Vite 前端开发服务器（端口 3456）

Vite 配置了 proxy，将 `/api` 请求代理到 Express 的 3457 端口。
