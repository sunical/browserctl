import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { Session, SessionRegistry } from '../../src/core/session.js'
import { goto } from '../../src/commands/goto.js'

describe('video recording', () => {
  it('saves a video file on close when record is enabled', async () => {
    const session = await Session.create({ headless: true, record: true })
    await goto(session.page, 'https://example.com')
    await session.page.waitForTimeout(500) // allow frames to be captured
    const videoPath = await session.close()
    expect(videoPath).toBeTruthy()
    expect(existsSync(videoPath!)).toBe(true)
    expect(videoPath).toMatch(/\.webm$/)
  })

  it('returns no video path when record is disabled', async () => {
    const session = await Session.create({ headless: true, record: false })
    await goto(session.page, 'https://example.com')
    const videoPath = await session.close()
    expect(videoPath).toBeUndefined()
  })
})

describe('recording failure handling', () => {
  it('closes cleanly when the recording captured no frames', async () => {
    // A session that closes immediately may never paint, which makes
    // Playwright's video.path() throw.
    const session = await Session.create({ headless: true, record: true })
    await expect(session.close()).resolves.not.toThrow()
  })

  it('removes the session from the registry even if closing fails', async () => {
    const registry = new SessionRegistry()
    const session = await registry.create({ headless: true, record: true })
    await registry.remove(session.id)
    expect(registry.get(session.id)).toBeUndefined()
    expect(registry.list().length).toBe(0)
  })
})
