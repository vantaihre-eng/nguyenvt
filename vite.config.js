import { defineConfig } from 'vite';

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
