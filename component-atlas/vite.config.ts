import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// src/library is a junction, and Vite works with real paths, so library files
// live outside this project: serve them, and resolve React from here so the
// library and the atlas share one copy.
const library = realpathSync(fileURLToPath(new URL('./src/library', import.meta.url)));

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    host: '127.0.0.1',
    port: 19000,
    strictPort: true,
    fs: { allow: ['.', library] },
  },
  preview: { host: '127.0.0.1', port: 19001, strictPort: true },
});
