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

describe('goto URL schemes', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('navigates to a data: URL without mangling it', async () => {
    // Prepending https:// to a data: URL made it unnavigable.
    const result = await goto(session.page, 'data:text/html,<h1>hello</h1>')
    expect(result.url.startsWith('data:')).toBe(true)
    expect(await session.page.locator('h1').textContent()).toBe('hello')
  })

  it('still prepends https to a bare host', async () => {
    const result = await goto(session.page, 'example.com')
    expect(result.url).toBe('https://example.com/')
  })

  it('treats host:port as a host, not a scheme', async () => {
    // "localhost:1" must not be read as scheme "localhost"; the error proves
    // https:// was prepended before the request was attempted.
    //
    // Own session: a failed navigation leaves the page in an error state that
    // races with whatever the next test navigates to.
    const isolated = await Session.create({ headless: true })
    await expect(goto(isolated.page, 'localhost:1')).rejects.toThrow('https://localhost:1/')
    await isolated.close()
  })

  it('leaves an explicit scheme alone', async () => {
    const result = await goto(session.page, 'https://example.com')
    expect(result.url).toBe('https://example.com/')
  })
})
