import type { Page } from 'playwright'

export async function click(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  await page.mouse.click(x, y)
  return { x, y }
}
