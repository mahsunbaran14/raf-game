// CrazyGames: tüm yollar relative olmalı (brief §4.1)
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 8192,
  },
});
