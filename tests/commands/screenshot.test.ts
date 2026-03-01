import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync } from 'fs'
import { Session } from '../../src/core/session.js'
import { screenshot } from '../../src/commands/screenshot.js'
import { goto } from '../../src/commands/goto.js'

describe('screenshot', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await goto(session.page, 'https://example.com')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns a file path and base64 string', async () => {
    const result = await screenshot(session.page)
    expect(result.path).toBeTruthy()
    expect(result.base64).toBeTruthy()
  })

  it('saves the screenshot to disk', async () => {
    const result = await screenshot(session.page)
    expect(existsSync(result.path)).toBe(true)
  })

  it('base64 decodes to a valid PNG', async () => {
    const result = await screenshot(session.page)
    const buffer = Buffer.from(result.base64, 'base64')
    // PNG magic bytes: 89 50 4E 47
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
    expect(buffer[2]).toBe(0x4e)
    expect(buffer[3]).toBe(0x47)
  })
})
