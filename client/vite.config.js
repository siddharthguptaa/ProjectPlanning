import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // So the browser can just call fetch('/api/...') during development
      // without worrying about the server's port or CORS.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
