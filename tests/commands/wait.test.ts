import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { wait, waitFor, parseWaitCondition } from '../../src/commands/wait.js'

describe('wait', () => {
  it('waits the specified number of milliseconds', async () => {
    const start = Date.now()
    await wait(200)
    expect(Date.now() - start).toBeGreaterThanOrEqual(190) // allow a few ms of timer imprecision
  })

  it('returns the waited duration', async () => {
    const result = await wait(100)
    expect(result.waited).toBe(100)
  })
})

describe('parseWaitCondition', () => {
  it('defaults to a fixed duration', () => {
    expect(parseWaitCondition({ ms: 500 })).toEqual({ kind: 'ms', ms: 500 })
  })

  it('builds condition types from flags', () => {
    expect(parseWaitCondition({ forSelector: '#x' })).toEqual({ kind: 'selector', selector: '#x' })
    expect(parseWaitCondition({ forGone: '#x' })).toEqual({ kind: 'gone', selector: '#x' })
    expect(parseWaitCondition({ forText: 'hi' })).toEqual({ kind: 'text', text: 'hi' })
    expect(parseWaitCondition({ forNetworkIdle: true })).toEqual({ kind: 'networkIdle' })
  })

  it('prefers a condition over a duration', () => {
    expect(parseWaitCondition({ ms: 500, forSelector: '#x' })).toEqual({ kind: 'selector', selector: '#x' })
  })

  it('rejects two conditions at once', () => {
    expect(() => parseWaitCondition({ forSelector: '#x', forText: 'hi' })).toThrow(/only one/)
  })

  it('rejects an empty invocation', () => {
    expect(() => parseWaitCondition({})).toThrow(/duration or a condition/)
  })
})

describe('waitFor', () => {
  let session: Session

  // A button that reveals #late after 300ms and hides #spinner.
  const fixture = `data:text/html,${encodeURIComponent(`
    <div id="spinner">Loading</div>
    <div id="late" style="display:none">Arrived</div>
    <script>
      setTimeout(() => {
        document.getElementById('spinner').style.display = 'none'
        document.getElementById('late').style.display = 'block'
      }, 300)
    </script>
  `)}`

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns as soon as a selector appears', async () => {
    await session.page.goto(fixture)
    const result = await waitFor(session.page, { kind: 'selector', selector: '#late' })
    expect(result.waited).toBeGreaterThanOrEqual(250)
    expect(result.waited).toBeLessThan(3000) // not the full 30s timeout
    expect(result.condition).toContain('#late')
  })

  it('returns as soon as a selector disappears', async () => {
    await session.page.goto(fixture)
    const result = await waitFor(session.page, { kind: 'gone', selector: '#spinner' })
    expect(result.waited).toBeLessThan(3000)
  })

  it('waits for text', async () => {
    await session.page.goto(fixture)
    const result = await waitFor(session.page, { kind: 'text', text: 'Arrived' })
    expect(result.condition).toContain('Arrived')
  })

  it('throws when the condition never holds', async () => {
    await session.page.goto(fixture)
    await expect(
      waitFor(session.page, { kind: 'selector', selector: '#never' }, 500)
    ).rejects.toThrow()
  })
})
