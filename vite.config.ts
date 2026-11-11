import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve('index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve('src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    fakeTimers: true,
    include: ['src/**/*.test.ts'],
  },
})
