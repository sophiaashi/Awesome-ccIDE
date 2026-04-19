// Electron 生产构建脚本 — 编译主进程和 preload 脚本
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function main(): Promise<void> {
  // 编译 main.ts
  await build({
    entryPoints: [path.join(rootDir, 'electron/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(rootDir, 'dist-electron/electron/main.cjs'),
    format: 'cjs',
    external: ['electron', 'node-pty'],
    sourcemap: false,
    minify: true,
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
    sourcemap: false,
    minify: true,
  })

  console.log('Electron 构建完成')
}

main().catch(err => {
  console.error('构建失败:', err)
  process.exit(1)
})
