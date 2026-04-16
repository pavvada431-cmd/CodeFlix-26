import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  loadEnv(mode, globalThis?.process?.cwd?.() ?? '.', '')
  const apiUrl = command === 'serve' ? 'http://localhost:4000/api' : '/api'

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react'
              }
              if (id.includes('three')) {
                return 'vendor-three'
              }
              if (id.includes('matter-js')) {
                return 'vendor-physics'
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
  }
})
