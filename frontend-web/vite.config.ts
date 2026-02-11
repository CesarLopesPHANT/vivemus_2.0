import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vivemus/shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 4000,
  },
});
