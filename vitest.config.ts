import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Nearly every file launches a real Chromium. Running all of them at once
    // starved browser startup badly enough to time out beforeAll hooks, so cap
    // how many run concurrently — the suite is bound by browser launches
    // either way.
    maxWorkers: 4,
    minWorkers: 1,
    testTimeout: 60000, // browser operations get slow under parallel load
    hookTimeout: 60000,
    include: ['tests/**/*.test.ts'],
  },
})
