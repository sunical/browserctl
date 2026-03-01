import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { Session } from '../../src/core/session.js'
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
