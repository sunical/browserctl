import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Session } from '../../src/core/session.js'
import { a11y } from '../../src/commands/a11y.js'
import { act } from '../../src/commands/act.js'

const FIXTURE = `
  <h1>Checkout</h1>
  <button>Main button</button>
  <iframe srcdoc="<button id='pay' onclick=&quot;this.textContent='PAID'&quot;>Pay now</button><input placeholder='Card number'>"></iframe>
  <iframe srcdoc="<a href='https://example.com'>Terms</a>"></iframe>
`

describe('a11y across iframes', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  beforeEach(async () => {
    await session.page.setContent(FIXTURE)
    await session.page.waitForTimeout(150)
  })

  it('finds elements inside iframes', async () => {
    // A page selector cannot cross a frame boundary, so each frame is scanned
    // on its own. Previously only the main frame's button was reported.
    const { tree, count } = await a11y(session.page)
    expect(tree).toContain('Main button')
    expect(tree).toContain('Pay now')
    expect(tree).toContain('Card number')
    expect(tree).toContain('Terms')
    expect(count).toBe(4)
  })

  it('labels each iframe so the agent knows which document it is in', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).toMatch(/--- iframe 1/)
    expect(tree).toMatch(/--- iframe 2/)
  })

  it('numbers refs continuously across frames', async () => {
    const { tree } = await a11y(session.page)
    const refs = [...tree.matchAll(/^\[(\d+)\]/gm)].map(m => Number(m[1]))
    expect(refs).toEqual([0, 1, 2, 3])
  })

  it('act resolves a ref that lives inside an iframe', async () => {
    await a11y(session.page)
    const result = await act(session.page, '1')
    expect(result.method).toBe('ref')
    const text = await session.page.frames()[1].locator('#pay').textContent()
    expect(text).toBe('PAID')
  })

  it('indexes frames on demand when no snapshot has run', async () => {
    const result = await act(session.page, '1')
    expect(result.method).toBe('ref')
    expect(await session.page.frames()[1].locator('#pay').textContent()).toBe('PAID')
  })

  it('still reports a clear error for an out-of-range ref', async () => {
    await a11y(session.page)
    await expect(act(session.page, '99')).rejects.toThrow(/No element with ref/)
  })

  it('omits a frame marker for frames with nothing actionable', async () => {
    await session.page.setContent(`<button>Only</button><iframe srcdoc="<p>text</p>"></iframe>`)
    await session.page.waitForTimeout(150)
    const { tree } = await a11y(session.page)
    expect(tree).not.toContain('--- iframe')
  })
})
