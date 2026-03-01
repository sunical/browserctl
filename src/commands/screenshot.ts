import { mkdir, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright'
import { ScreenshotResult } from '../types.js'

const screenshotDir = join(homedir(), '.browserctl', 'screenshots')

export async function screenshot(page: Page, fullPage = true): Promise<ScreenshotResult> {
  await mkdir(screenshotDir, { recursive: true })

  const filename = `${Date.now()}.png`
  const path = join(screenshotDir, filename)

  const buffer = await page.screenshot({ fullPage })
  const base64 = buffer.toString('base64')
  await writeFile(path, buffer)

  return { path, base64 }
}
