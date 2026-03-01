import { describe, it, expect } from 'vitest'
import { Session } from '../src/core/session.js'

describe('Session timeout', () => {
  it('closes automatically after inactivity timeout', async () => {
    const session = await Session.create({ headless: true, timeout: 300 }) // 300ms timeout
    // Wait for timeout to fire
    await new Promise(r => setTimeout(r, 500))
    // Page should be closed — navigation should throw
    await expect(session.page.goto('https://example.com')).rejects.toThrow()
  })

  it('resets timeout on touch()', async () => {
    const session = await Session.create({ headless: true, timeout: 400 })
    await new Promise(r => setTimeout(r, 250))
    session.touch() // reset the timer
    await new Promise(r => setTimeout(r, 250))
    // Should still be alive — touch reset the 400ms timer
    expect(session.page.url()).toBeTruthy()
    await session.close()
  })
})
