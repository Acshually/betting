import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Add this

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true, 
    proxy: {
      // Use 'backend-api' to match your docker-compose service name
      '/ws': {
        target: 'ws://backend-api:8000', 
        ws: true,
        rewriteWsOrigin: true,
      },
      '/place_bet': {
        target: 'http://backend-api:8000',
        changeOrigin: true,
      },
    },
    hmr: {
      clientPort: 443, 
    },
  },
})