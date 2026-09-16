import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },
  build: { target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'es2020' }
});
