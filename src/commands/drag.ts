import type { Page } from 'playwright'

export async function drag(
  page: Page,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Promise<{ from: { x: number; y: number }; to: { x: number; y: number } }> {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 10 })
  await page.mouse.up()
  return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } }
}
