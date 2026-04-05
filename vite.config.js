import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '',
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: false
      },
      mangle: true
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        modularPhase1: resolve(__dirname, 'modular-phase1/index.html')
      },
      output: {
        // Remove manualChunks for now or use correct names if needed
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
