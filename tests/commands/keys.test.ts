import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { keys } from '../../src/commands/keys.js'

describe('keys', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.setContent('<html><body><input id="field" type="text" /></body></html>')
    await session.page.locator('#field').click()
  })

  afterAll(async () => {
    await session.close()
  })

  it('types text with type method', async () => {
    await session.page.setContent('<html><body><input id="field" type="text" /></body></html>')
    await session.page.locator('#field').click()
    await keys(session.page, 'type', 'hello')
    const value = await session.page.locator('#field').inputValue()
    expect(value).toBe('hello')
  })

  it('returns the method and value', async () => {
    const result = await keys(session.page, 'press', 'Tab')
    expect(result.method).toBe('press')
    expect(result.value).toBe('Tab')
  })

  it('repeats key press', async () => {
    await session.page.setContent('<html><body><input id="field" type="text" /></body></html>')
    await session.page.locator('#field').click()
    await keys(session.page, 'type', 'aaa')
    await keys(session.page, 'press', 'Backspace', 2)
    const value = await session.page.locator('#field').inputValue()
    expect(value).toBe('a')
  })
})
