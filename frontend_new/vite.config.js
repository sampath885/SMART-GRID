import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => {
          // For /api/kpi-metrics, /api/commit-shift, /api/anomalies keep /api
          // For /api/predict-and-advise, /api/what-if-scenario, /api/forecast-24h strip /api
          if (path.match(/\/(kpi-metrics|commit-shift|anomalies|commitment-history)/)) {
            return path; // Keep /api for new endpoints
          }
          return path.replace(/^\/api/, ''); // Strip /api for old endpoints
        }
      }
    }
  }
})
