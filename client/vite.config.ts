import { defineConfig } from 'vite';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scenes': path.resolve(__dirname, './src/scenes'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@network': path.resolve(__dirname, './src/network'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy REST API requests to Go API server
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Proxy WebSocket to Go Game server
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/assets/**/*',
          dest: 'assets',
        },
      ],
    }),
  ],
});
