import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../src/core/session.js'
import { goto } from '../src/commands/goto.js'
import { act } from '../src/commands/act.js'
import { a11y } from '../src/commands/a11y.js'
import { extract } from '../src/commands/extract.js'

describe('reading the page while a navigation is in flight', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('extract does not throw on a document with no body yet', async () => {
    // The README's library example does exactly this, and it used to fail with
    // "Cannot read properties of null (reading 'innerText')".
    await goto(session.page, 'https://example.com')
    await act(session.page, 'click Learn more')
    const result = await extract(session.page)
    expect(typeof result.text).toBe('string')
  })

  it('a11y does not throw immediately after a click that navigates', async () => {
    await goto(session.page, 'https://example.com')
    await act(session.page, 'click Learn more')
    const result = await a11y(session.page)
    expect(typeof result.tree).toBe('string')
  })

  it('a11y --full does not throw either', async () => {
    await goto(session.page, 'https://example.com')
    await act(session.page, 'click Learn more')
    const result = await a11y(session.page, { full: true })
    expect(typeof result.tree).toBe('string')
  })

  it('extract returns a string on a blank page', async () => {
    const blank = await Session.create({ headless: true })
    const result = await extract(blank.page)
    expect(result.text).toBe('')
    await blank.close()
  })
})
