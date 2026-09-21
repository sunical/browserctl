import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../src/core/session.js'
import { observe } from '../src/core/observe.js'
import { goto } from '../src/commands/goto.js'
import { act } from '../src/commands/act.js'

describe('observe', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns the page state after an action', async () => {
    await goto(session.page, 'https://example.com')
    const result = await observe(session.page)
    expect(result.url).toContain('example.com')
    expect(result.title).toBe('Example Domain')
    expect(result.count).toBeGreaterThan(0)
    expect(result.tree).toContain('Learn more')
  })

  it('reflects the page the action navigated to, not the one it left', async () => {
    await goto(session.page, 'https://example.com')
    await act(session.page, 'click Learn more')
    const result = await observe(session.page)
    expect(result.url).not.toContain('example.com/')
    expect(result.tree).not.toContain('[0] link "Learn more"')
  })
})
