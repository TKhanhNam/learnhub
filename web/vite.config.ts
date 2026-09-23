import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/auth'),
      },
      '/api/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/users/, '/users'),
      },
      '/api/catalog': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/catalog/, '/catalog'),
      },
      '/api/learning': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/learning/, '/learning'),
      },
      '/api/content': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/content/, '/content'),
      },
      '/api/commerce': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/commerce/, '/commerce'),
      },
      '/api/social': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/social/, '/social'),
      },
      '/api/org': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/org/, '/org'),
      },
      '/api/assist': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/assist/, '/assist'),
      },
    },
  },
})
