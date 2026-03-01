import { describe, it, expect, afterEach } from 'vitest'
import { Session, SessionRegistry } from '../src/core/session.js'

describe('Session', () => {
  let session: Session

  afterEach(async () => {
    await session.close().catch(() => {})
  })

  it('creates a session with a unique id', async () => {
    session = await Session.create({ headless: true })
    expect(session.id).toBeTruthy()
    expect(typeof session.id).toBe('string')
  })

  it('starts at about:blank', async () => {
    session = await Session.create({ headless: true })
    expect(session.url).toBe('about:blank')
  })

  it('updates lastActivity on touch()', async () => {
    session = await Session.create({ headless: true })
    const before = session.lastActivity
    await new Promise(r => setTimeout(r, 10))
    session.touch()
    expect(session.lastActivity).toBeGreaterThan(before)
  })

  it('returns session info', async () => {
    session = await Session.create({ headless: true })
    const info = session.info()
    expect(info.id).toBe(session.id)
    expect(info.url).toBe('about:blank')
    expect(info.createdAt).toBeLessThanOrEqual(Date.now())
  })
})

describe('SessionRegistry', () => {
  const registry = new SessionRegistry()

  afterEach(async () => {
    await registry.closeAll()
  })

  it('creates and retrieves a session', async () => {
    const session = await registry.create({ headless: true })
    expect(registry.get(session.id)).toBe(session)
  })

  it('lists all sessions', async () => {
    await registry.create({ headless: true })
    await registry.create({ headless: true })
    expect(registry.list().length).toBe(2)
  })

  it('removes a session', async () => {
    const session = await registry.create({ headless: true })
    const result = await registry.remove(session.id)
    expect(result.found).toBe(true)
    expect(registry.get(session.id)).toBeUndefined()
  })

  it('returns found: false when removing non-existent session', async () => {
    const result = await registry.remove('does-not-exist')
    expect(result.found).toBe(false)
  })
})
