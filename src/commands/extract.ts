import type { Page } from 'playwright'
import { ExtractResult } from '../types.js'

export async function extract(page: Page, selector?: string): Promise<ExtractResult> {
  let text: string

  if (selector) {
    const elements = await page.locator(selector).allTextContents()
    text = elements.join('\n').trim()
  } else {
    text = await page.evaluate(() => document.body.innerText)
  }

  return {
    text,
    url: page.url(),
  }
}
