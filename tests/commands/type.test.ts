import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { type } from '../../src/commands/type.js'
import { goto } from '../../src/commands/goto.js'

describe('type', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    // Use a page with an input field
    await session.page.setContent('<html><body><input id="field" type="text" /></body></html>')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns the text typed', async () => {
    const result = await type(session.page, 100, 100, 'hello world')
    expect(result.text).toBe('hello world')
  })

  it('types into a focused input', async () => {
    await session.page.setContent('<html><body><input id="field" type="text" /></body></html>')
    const input = session.page.locator('#field')
    const box = await input.boundingBox()
    await type(session.page, box!.x + box!.width / 2, box!.y + box!.height / 2, 'typed text')
    const value = await input.inputValue()
    expect(value).toBe('typed text')
  })
})
