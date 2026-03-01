import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { back } from '../../src/commands/back.js'
import { goto } from '../../src/commands/goto.js'

describe('back', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('navigates back to the previous page', async () => {
    await goto(session.page, 'https://example.com')
    await goto(session.page, 'https://example.org')
    const result = await back(session.page)
    expect(result.url).toContain('example.com')
  })

  it('returns the url after going back', async () => {
    const result = await back(session.page)
    expect(result.url).toBeTruthy()
  })
})
