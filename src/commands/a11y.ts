import type { Page } from 'playwright'
import { A11yResult } from '../types.js'

export async function a11y(page: Page): Promise<A11yResult> {
  const tree = await page.evaluate(() => {
    function nodeToText(node: Element, indent: number): string {
      const pad = '  '.repeat(indent)
      const role = node.getAttribute('role') || node.tagName.toLowerCase()
      const name =
        node.getAttribute('aria-label') ||
        node.getAttribute('alt') ||
        node.getAttribute('placeholder') ||
        node.getAttribute('title') ||
        (node as HTMLInputElement).value ||
        node.textContent?.trim().slice(0, 80) ||
        ''
      const disabled = node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true'
        ? ' [disabled]' : ''
      const expanded = node.getAttribute('aria-expanded') !== null
        ? ` [expanded=${node.getAttribute('aria-expanded')}]` : ''
      const checked = node.getAttribute('aria-checked') !== null
        ? ` [checked=${node.getAttribute('aria-checked')}]` : ''
      const label = name ? ` "${name}"` : ''

      let text = `${pad}${role}${label}${disabled}${expanded}${checked}\n`

      for (const child of Array.from(node.children)) {
        text += nodeToText(child, indent + 1)
      }
      return text
    }
    return nodeToText(document.body, 0)
  })

  return {
    tree: tree || '(empty)',
    url: page.url(),
  }
}
