import { describe, it, expect } from 'vitest'
import { wait } from '../../src/commands/wait.js'

describe('wait', () => {
  it('waits the specified number of milliseconds', async () => {
    const start = Date.now()
    await wait(200)
    expect(Date.now() - start).toBeGreaterThanOrEqual(190) // allow a few ms of timer imprecision
  })

  it('returns the waited duration', async () => {
    const result = await wait(100)
    expect(result.waited).toBe(100)
  })
})
