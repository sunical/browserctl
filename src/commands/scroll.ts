import type { Page } from 'playwright'

export async function scroll(
  page: Page,
  direction: 'up' | 'down',
  percent = 80
): Promise<{ direction: string; percent: number }> {
  const viewportHeight = page.viewportSize()?.height ?? 768
  const delta = Math.round((viewportHeight * percent) / 100)
  await page.mouse.wheel(0, direction === 'down' ? delta : -delta)
  return { direction, percent }
}
