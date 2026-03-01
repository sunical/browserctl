import type { Page } from 'playwright'

export async function type(page: Page, x: number, y: number, text: string): Promise<{ text: string }> {
  await page.mouse.click(x, y)
  await page.keyboard.type(text)
  return { text }
}
