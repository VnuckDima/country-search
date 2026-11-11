import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    fakeTimers: true,
    include: ['src/**/*.test.ts'],
  },
})
