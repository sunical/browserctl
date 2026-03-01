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
