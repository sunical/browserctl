import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { mkdir } from 'fs/promises'
import { VIDEO_DIR } from './config.js'

const videoDir = VIDEO_DIR

export interface Viewport {
  width: number
  height: number
}

export interface LaunchOptions {
  headless?: boolean
  record?: boolean
  /**
   * Pixels rendered per CSS pixel. 2 gives retina-density screenshots without
   * changing the layout or any coordinate the click/type/drag commands take —
   * those stay in CSS pixels.
   */
  deviceScaleFactor?: number
  viewport?: Viewport
}

export const DEFAULT_VIEWPORT: Viewport = { width: 1280, height: 720 }

export interface BrowserInstance {
  browser: Browser
  context: BrowserContext
  page: Page
}

export async function launch(options: LaunchOptions = {}): Promise<BrowserInstance> {
  const browser = await chromium.launch({
    headless: options.headless ?? true,
  })

  const viewport = options.viewport ?? DEFAULT_VIEWPORT

  if (options.record) {
    await mkdir(videoDir, { recursive: true })
  }

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor,
    // Record at the viewport's own size rather than a fixed 720p.
    ...(options.record ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
  })
  const page = await context.newPage()
  return { browser, context, page }
}

export async function close(instance: BrowserInstance): Promise<void> {
  await instance.context.close().catch(() => {})
  await instance.browser.close().catch(() => {})
}
