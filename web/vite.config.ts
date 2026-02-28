import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { probeApiPlugin } from './vite-plugin-probe-api';

export default defineConfig({
  plugins: [
    probeApiPlugin(), // Must run first so /api/probe-domains is handled before Vite's SPA fallback
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      // Use browser-safe blacklist (no Node fs/module) when bundling for web
      '../src/blacklist': resolve(__dirname, '../src/blacklist-browser'),
      './blacklist.js': resolve(__dirname, '../src/blacklist-browser'),
    },
  },
  server: {
    port: 5173,
  },
});
