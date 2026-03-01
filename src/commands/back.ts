import type { Page } from 'playwright'

export async function back(page: Page): Promise<{ url: string }> {
  await page.goBack({ waitUntil: 'domcontentloaded' })
  return { url: page.url() }
}
