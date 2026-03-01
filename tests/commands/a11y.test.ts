import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { a11y } from '../../src/commands/a11y.js'
import { goto } from '../../src/commands/goto.js'

describe('a11y', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await goto(session.page, 'https://example.com')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns a tree and url', async () => {
    const result = await a11y(session.page)
    expect(result.url).toContain('example.com')
    expect(result.tree).toBeTruthy()
  })

  it('tree contains page content', async () => {
    const result = await a11y(session.page)
    expect(result.tree).toContain('Example Domain')
  })

  it('returns (empty) on blank page', async () => {
    const blank = await Session.create({ headless: true })
    const result = await a11y(blank.page)
    expect(result.tree).toBeTruthy()
    await blank.close()
  })
})
