import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Session } from '../../src/core/session.js'
import { act } from '../../src/commands/act.js'
import { a11y } from '../../src/commands/a11y.js'
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

  beforeEach(async () => {
    await goto(session.page, 'https://example.com')
  })

  it('clicks an element by text', async () => {
    const result = await act(session.page, 'click Learn more')
    expect(result.success).toBe(true)
    expect(result.method).toBe('getByText')
  })

  it('returns the method used', async () => {
    const result = await act(session.page, 'click Learn more')
    expect(result.method).toBeTruthy()
    expect(result.selector).toBe('click Learn more')
  })

  it('throws when element not found', async () => {
    await expect(act(session.page, 'click nonexistent element xyz123')).rejects.toThrow()
  })

  it('does not treat a substring role as a role match', async () => {
    // "NoSuchButton" contains "button"; this must not fall back to clicking
    // the page's first button.
    await expect(act(session.page, 'click NoSuchButton')).rejects.toThrow(/Could not find/)
  })
})

describe('act by ref', () => {
  let session: Session

  const fixture = `data:text/html,${encodeURIComponent(`
    <button id="a" onclick="document.title='clicked-a'">Alpha</button>
    <button id="b" onclick="document.title='clicked-b'">Beta</button>
  `)}`

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  beforeEach(async () => {
    await session.page.goto(fixture)
  })

  it('clicks the element carrying that ref', async () => {
    await a11y(session.page)
    const result = await act(session.page, '1')
    expect(result.method).toBe('ref')
    expect(await session.page.title()).toBe('clicked-b')
  })

  it('accepts bracketed and verb-prefixed forms', async () => {
    await a11y(session.page)
    await act(session.page, '[0]')
    expect(await session.page.title()).toBe('clicked-a')

    await session.page.goto(fixture)
    await a11y(session.page)
    await act(session.page, 'click [1]')
    expect(await session.page.title()).toBe('clicked-b')
  })

  it('indexes the page on demand when no snapshot has run', async () => {
    // No a11y() call first — this is what happens inside a `run` script.
    const result = await act(session.page, '0')
    expect(result.method).toBe('ref')
    expect(await session.page.title()).toBe('clicked-a')
  })

  it('reports an out-of-range ref quickly instead of hanging', async () => {
    await a11y(session.page)
    const start = Date.now()
    await expect(act(session.page, '99')).rejects.toThrow(/No element with ref/)
    expect(Date.now() - start).toBeLessThan(5000)
  })
})
