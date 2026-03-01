import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000, // browser operations can be slow
    include: ['tests/**/*.test.ts'],
  },
})
