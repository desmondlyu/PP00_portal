import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../',
    emptyOutDir: false,
  },
  server: {
    port: 3100,
    strictPort: true,
  },
});
