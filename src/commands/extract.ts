import type { Page } from 'playwright'
import { ExtractResult } from '../types.js'

export async function extract(
  page: Page,
  selector?: string,
  options: { maxChars?: number } = {}
): Promise<ExtractResult> {
  // A navigation kicked off by the previous command may still be in flight, in
  // which case the new document has no body yet and innerText throws.
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})

  let text: string

  if (selector) {
    const elements = await page.locator(selector).allTextContents()
    text = elements.join('\n').trim()
  } else {
    text = await page.evaluate(() => document.body?.innerText ?? '')
  }

  const max = options.maxChars
  const truncated = max !== undefined && max > 0 && text.length > max

  return {
    text: truncated ? text.slice(0, max) : text,
    url: page.url(),
    ...(truncated ? { truncated: true, totalChars: text.length } : {}),
  }
}
