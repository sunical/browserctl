import type { Page } from 'playwright'

export async function keys(
  page: Page,
  method: 'press' | 'type',
  value: string,
  repeat = 1
): Promise<{ method: string; value: string }> {
  if (method === 'press') {
    for (let i = 0; i < repeat; i++) {
      await page.keyboard.press(value)
    }
  } else {
    await page.keyboard.type(value)
  }
  return { method, value }
}
