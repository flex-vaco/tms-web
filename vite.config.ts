import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5605,
    proxy: {
      '/api': {
        target: 'http://api:4001',
        changeOrigin: true,
      },
    },
  },
});
