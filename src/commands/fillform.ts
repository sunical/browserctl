import type { Page } from 'playwright'
import { act } from './act.js'

export interface FormField {
  field: string
  value: string
}

export async function fillform(page: Page, fields: FormField[]): Promise<{ filled: number }> {
  for (const { field, value } of fields) {
    // Try label first, then placeholder, then fall back to act
    const byLabel = page.getByLabel(field, { exact: false })
    const byPlaceholder = page.getByPlaceholder(field, { exact: false })

    let filled = false
    for (const locator of [byLabel, byPlaceholder]) {
      try {
        await locator.first().waitFor({ state: 'visible', timeout: 3000 })
        await locator.first().fill(value)
        filled = true
        break
      } catch {
        // try next
      }
    }

    if (!filled) {
      // Last resort: use act to click then keyboard type
      await act(page, `click ${field}`)
      await page.keyboard.type(value)
    }
  }
  return { filled: fields.length }
}

export function parseFields(raw: string): FormField[] {
  return raw.split(',').map(pair => {
    const eq = pair.indexOf('=')
    if (eq === -1) throw new Error(`Invalid field format: "${pair}". Use "field=value"`)
    return {
      field: pair.slice(0, eq).trim(),
      value: pair.slice(eq + 1).trim(),
    }
  })
}
