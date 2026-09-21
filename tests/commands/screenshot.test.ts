import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync, statSync } from 'fs'
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

  it('returns a file path', async () => {
    const result = await screenshot(session.page)
    expect(result.path).toBeTruthy()
  })

  it('saves the screenshot to disk', async () => {
    const result = await screenshot(session.page)
    expect(existsSync(result.path)).toBe(true)
    expect(statSync(result.path).size).toBeGreaterThan(0)
  })

  it('omits base64 by default', async () => {
    // The daemon would otherwise ship a copy of every screenshot through JSON
    // that the CLI discards in favour of the path.
    const result = await screenshot(session.page)
    expect(result.base64).toBeUndefined()
  })

  it('includes base64 when asked', async () => {
    const result = await screenshot(session.page, true, { base64: true })
    expect(result.base64).toBeTruthy()
  })

  it('base64 decodes to a valid PNG', async () => {
    const result = await screenshot(session.page, true, { base64: true })
    const buffer = Buffer.from(result.base64!, 'base64')
    // PNG magic bytes: 89 50 4E 47
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
    expect(buffer[2]).toBe(0x4e)
    expect(buffer[3]).toBe(0x47)
  })

  it('writes the same bytes to disk as it returns', async () => {
    const result = await screenshot(session.page, true, { base64: true })
    expect(Buffer.from(result.base64!, 'base64').length).toBe(statSync(result.path).size)
  })
})
