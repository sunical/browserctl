import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { fillform, parseFields } from '../../src/commands/fillform.js'

describe('parseFields', () => {
  it('parses a single field', () => {
    expect(parseFields('email=test@example.com')).toEqual([
      { field: 'email', value: 'test@example.com' },
    ])
  })

  it('parses multiple fields', () => {
    expect(parseFields('email=foo@bar.com,password=secret')).toEqual([
      { field: 'email', value: 'foo@bar.com' },
      { field: 'password', value: 'secret' },
    ])
  })

  it('handles values with spaces', () => {
    expect(parseFields('name=John Doe')).toEqual([
      { field: 'name', value: 'John Doe' },
    ])
  })

  it('handles values containing equals signs', () => {
    expect(parseFields('query=a=b')).toEqual([
      { field: 'query', value: 'a=b' },
    ])
  })

  it('throws on missing equals sign', () => {
    expect(() => parseFields('badfield')).toThrow()
  })
})

describe('fillform', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns the number of fields filled', async () => {
    await session.page.setContent(`
      <html><body>
        <label>Email <input id="email" type="text" /></label>
        <label>Password <input id="password" type="password" /></label>
      </body></html>
    `)
    const result = await fillform(session.page, [
      { field: 'Email', value: 'test@example.com' },
      { field: 'Password', value: 'secret' },
    ])
    expect(result.filled).toBe(2)
  })
})
