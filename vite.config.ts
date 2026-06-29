import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.PORT || '8787'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // The key lives behind this proxy — the browser only ever talks to /api.
        '/api': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
        },
      },
    },
  }
})
