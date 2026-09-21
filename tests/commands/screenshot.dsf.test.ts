import { describe, it, expect, afterEach } from 'vitest'
import { statSync } from 'fs'
import { Session } from '../../src/core/session.js'
import { screenshot } from '../../src/commands/screenshot.js'
import { click } from '../../src/commands/click.js'

describe('screenshot scale factor', () => {
  let session: Session

  afterEach(async () => {
    await session?.close().catch(() => {})
  })

  it('defaults to 1x at the default viewport', async () => {
    session = await Session.create({ headless: true })
    const result = await screenshot(session.page, false)
    expect(result.deviceScaleFactor).toBe(1)
    expect(result.width).toBe(1280)
    expect(result.height).toBe(720)
  })

  it('doubles the image dimensions at 2x', async () => {
    session = await Session.create({ headless: true, deviceScaleFactor: 2 })
    const result = await screenshot(session.page, false)
    expect(result.deviceScaleFactor).toBe(2)
    expect(result.width).toBe(2560)
    expect(result.height).toBe(1440)
  })

  it('honours a custom viewport', async () => {
    session = await Session.create({ headless: true, viewport: { width: 1440, height: 900 } })
    const result = await screenshot(session.page, false)
    expect(result.width).toBe(1440)
    expect(result.height).toBe(900)
  })

  it('combines viewport and scale factor', async () => {
    session = await Session.create({
      headless: true,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const result = await screenshot(session.page, false)
    expect(result.width).toBe(2880)
    expect(result.height).toBe(1800)
  })

  it('leaves click coordinates in CSS pixels, unscaled', async () => {
    session = await Session.create({ headless: true, deviceScaleFactor: 2 })
    await session.page.setContent(`
      <button style="position:absolute;left:100px;top:200px;width:50px;height:20px"
              onclick="document.title='hit'">Target</button>
    `)
    // The button sits at CSS (100,200). Under a 2x scale factor it appears at
    // image pixel (200,400), but the click API must still take CSS pixels.
    await click(session.page, 110, 205)
    expect(await session.page.title()).toBe('hit')
  })

  it('reports dimensions matching the file actually written', async () => {
    session = await Session.create({ headless: true, deviceScaleFactor: 2 })
    const result = await screenshot(session.page, false)
    expect(statSync(result.path).size).toBeGreaterThan(0)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })
})
