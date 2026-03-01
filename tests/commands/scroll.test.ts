import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { scroll } from '../../src/commands/scroll.js'

describe('scroll', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.setContent(`
      <html><body style="height:5000px">
        <div style="height:5000px">tall content</div>
      </body></html>
    `)
  })

  afterAll(async () => {
    await session.close()
  })

  it('scrolls down and returns direction and percent', async () => {
    const result = await scroll(session.page, 'down', 80)
    expect(result.direction).toBe('down')
    expect(result.percent).toBe(80)
  })

  it('scrolls up', async () => {
    const result = await scroll(session.page, 'up', 50)
    expect(result.direction).toBe('up')
    expect(result.percent).toBe(50)
  })

  it('defaults to 80 percent', async () => {
    const result = await scroll(session.page, 'down')
    expect(result.percent).toBe(80)
  })

  it('actually moves the scroll position', async () => {
    await session.page.evaluate(() => window.scrollTo(0, 0))
    await scroll(session.page, 'down', 100)
    const scrollY = await session.page.evaluate(() => window.scrollY)
    expect(scrollY).toBeGreaterThan(0)
  })
})
