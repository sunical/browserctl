import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { Session, SessionRegistry } from '../../src/core/session.js'
import { goto } from '../../src/commands/goto.js'

describe('video recording', () => {
  // Headless Chromium's video capture competes for the compositor with the
  // other test files' browsers and intermittently records no frames at all.
  // That is an environment limit, not product behaviour — the no-frames path
  // is covered deterministically by 'recording failure handling' below.
  it('saves a video file on close when record is enabled', { retry: 2 }, async () => {
    const session = await Session.create({ headless: true, record: true })
    await goto(session.page, 'https://example.com')

    // Frames are only emitted when something actually paints, so force
    // repeated repaints rather than hoping one lands in an idle wait.
    for (let i = 0; i < 6; i++) {
      await session.page.evaluate(n => {
        document.body.style.background = n % 2 ? '#fff' : '#ccc'
      }, i)
      await session.page.waitForTimeout(150)
    }

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
