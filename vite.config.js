import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  loadEnv(mode, globalThis?.process?.cwd?.() ?? '.', '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        }
      }
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
