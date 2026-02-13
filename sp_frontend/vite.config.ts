import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: process.env.VITE_HOST || '0.0.0.0', // Use environment variable or default to 0.0.0.0
    port: parseInt(process.env.VITE_PORT || '5173'), // Use environment variable or default to 5173
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:6000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});