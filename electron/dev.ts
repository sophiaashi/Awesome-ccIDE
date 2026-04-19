// Electron 开发模式启动脚本
// 等待 Vite dev server 就绪后启动 Electron
import { spawn } from 'child_process'
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Vite dev server 地址
const VITE_DEV_URL = 'http://localhost:3456'

/**
 * 使用 esbuild 编译 Electron 主进程和 preload 脚本
 */
async function buildElectron(): Promise<void> {
  // 编译 main.ts（打包 server/sessions.ts 进来）
  await build({
    entryPoints: [path.join(rootDir, 'electron/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(rootDir, 'dist-electron/electron/main.cjs'),
    format: 'cjs',
    external: ['electron', 'node-pty'],
    sourcemap: true,
  })

  // 编译 preload.ts
  await build({
    entryPoints: [path.join(rootDir, 'electron/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(rootDir, 'dist-electron/electron/preload.cjs'),
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  })

  console.log('Electron 代码编译完成')
}

/**
 * 等待 Vite dev server 就绪
 */
async function waitForVite(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        console.log('Vite dev server 就绪')
        return
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error('等待 Vite dev server 超时')
}

async function main(): Promise<void> {
  // 编译 Electron 代码
  await buildElectron()

  // 等待 Vite dev server 启动
  await waitForVite(VITE_DEV_URL)

  // 启动 Electron
  const electronPath = path.join(rootDir, 'node_modules/.bin/electron')
  const electronProcess = spawn(electronPath, [path.join(rootDir, 'dist-electron/electron/main.cjs')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: VITE_DEV_URL,
    },
  })

  electronProcess.on('close', (code) => {
    console.log(`Electron 已退出 (code: ${code})`)
    process.exit(code ?? 0)
  })
}

main().catch(err => {
  console.error('启动 Electron 失败:', err)
  process.exit(1)
})
