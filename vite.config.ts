import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/f1-game/',
  plugins: [tailwindcss()],
  server: { port: 5173 },
});
