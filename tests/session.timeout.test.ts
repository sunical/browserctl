import { describe, it, expect } from 'vitest'
import { Session, SessionRegistry } from '../src/core/session.js'

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

describe('Session expiry cleanup', () => {
  it('marks itself closed when the timeout fires', async () => {
    const session = await Session.create({ headless: true, timeout: 300 })
    expect(session.closed).toBe(false)
    await new Promise(r => setTimeout(r, 500))
    expect(session.closed).toBe(true)
  })

  it('drops expired sessions from the registry instead of leaking them', async () => {
    const registry = new SessionRegistry()
    const session = await registry.create({ headless: true, timeout: 300 })
    expect(registry.list().length).toBe(1)

    await new Promise(r => setTimeout(r, 600))

    // Before the onExpire hook, the browser closed but the entry stayed in the
    // map forever, so commands failed with an opaque Playwright error.
    expect(registry.get(session.id)).toBeUndefined()
    expect(registry.list().length).toBe(0)
  })

  it('close() is idempotent', async () => {
    const session = await Session.create({ headless: true })
    await session.close()
    await expect(session.close()).resolves.toBeUndefined()
  })
})
