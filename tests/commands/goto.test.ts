import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { goto } from '../../src/commands/goto.js'

describe('goto', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('navigates to a URL', async () => {
    const result = await goto(session.page, 'https://example.com')
    expect(result.url).toContain('example.com')
  })

  it('prepends https:// if no protocol given', async () => {
    const result = await goto(session.page, 'example.com')
    expect(result.url).toContain('example.com')
  })
})
