import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Page } from 'playwright'
import { ScreenshotResult } from '../types.js'
import { SCREENSHOT_DIR } from '../core/config.js'

/** Read width/height from a PNG's IHDR chunk — cheaper than decoding the image. */
function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) {
    return { width: 0, height: 0 }
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

export async function screenshot(
  page: Page,
  fullPage = true,
  options: { base64?: boolean } = {}
): Promise<ScreenshotResult> {
  await mkdir(SCREENSHOT_DIR, { recursive: true })

  const filename = `${Date.now()}.png`
  const path = join(SCREENSHOT_DIR, filename)

  const buffer = await page.screenshot({ fullPage })
  await writeFile(path, buffer)

  const { width, height } = pngDimensions(buffer)
  const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio).catch(() => 1)

  return {
    path,
    width,
    height,
    deviceScaleFactor,
    // Opt-in: the daemon would otherwise ship a base64 copy of every screenshot
    // through JSON — 2.9MB for a full-page Wikipedia capture — which the CLI
    // discards immediately in favour of the file path.
    ...(options.base64 ? { base64: buffer.toString('base64') } : {}),
  }
}
