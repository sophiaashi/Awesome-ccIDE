import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Electron renderer 需要用相对路径加载资源
  base: './',
  server: {
    port: 3456,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
