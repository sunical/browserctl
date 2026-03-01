import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { click } from '../../src/commands/click.js'
import { goto } from '../../src/commands/goto.js'

describe('click', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await goto(session.page, 'https://example.com')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns the coordinates clicked', async () => {
    const result = await click(session.page, 100, 200)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('accepts zero coordinates', async () => {
    const result = await click(session.page, 0, 0)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })
})
