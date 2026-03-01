import type { Page } from 'playwright'

export async function goto(page: Page, url: string): Promise<{ url: string }> {
  // Prepend https:// if no protocol given
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`
  await page.goto(target, { waitUntil: 'domcontentloaded' })
  return { url: page.url() }
}
