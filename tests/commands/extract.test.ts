import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { extract } from '../../src/commands/extract.js'

describe('extract', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.setContent(`
      <html><body>
        <h1>Page Title</h1>
        <p class="intro">Intro paragraph</p>
        <div class="content">Content div</div>
      </body></html>
    `)
  })

  afterAll(async () => {
    await session.close()
  })

  it('extracts full page text', async () => {
    const result = await extract(session.page)
    expect(result.text).toContain('Page Title')
    expect(result.text).toContain('Intro paragraph')
    expect(result.text).toContain('Content div')
  })

  it('scopes extraction to a CSS selector', async () => {
    const result = await extract(session.page, '.intro')
    expect(result.text).toContain('Intro paragraph')
    expect(result.text).not.toContain('Page Title')
  })

  it('returns the current url', async () => {
    const result = await extract(session.page)
    expect(result.url).toBeTruthy()
  })
})

describe('extract --max-chars', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.setContent(`<body>${'x'.repeat(5000)}</body>`)
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns everything by default', async () => {
    const result = await extract(session.page)
    expect(result.text.length).toBe(5000)
    expect(result.truncated).toBeUndefined()
  })

  it('truncates and reports the true length', async () => {
    const result = await extract(session.page, undefined, { maxChars: 100 })
    expect(result.text.length).toBe(100)
    expect(result.truncated).toBe(true)
    expect(result.totalChars).toBe(5000)
  })

  it('does not mark short text as truncated', async () => {
    const result = await extract(session.page, undefined, { maxChars: 99999 })
    expect(result.truncated).toBeUndefined()
  })
})
