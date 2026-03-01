import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { act } from '../../src/commands/act.js'
import { goto } from '../../src/commands/goto.js'

describe('act', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await goto(session.page, 'https://example.com')
  })

  afterAll(async () => {
    await session.close()
  })

  it('clicks an element by text', async () => {
    const result = await act(session.page, 'click Learn more')
    expect(result.success).toBe(true)
    expect(result.method).toBe('getByText')
  })

  it('returns the method used', async () => {
    await goto(session.page, 'https://example.com')
    const result = await act(session.page, 'click Learn more')
    expect(result.method).toBeTruthy()
    expect(result.selector).toBe('click Learn more')
  })

  it('throws when element not found', async () => {
    await expect(act(session.page, 'click nonexistent element xyz123')).rejects.toThrow()
  })
})
