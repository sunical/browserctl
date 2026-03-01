import type { Page, Locator } from 'playwright'
import { ActResult } from '../types.js'

// Strategies tried in order. Each returns a locator if it can handle the instruction.
const strategies: Array<{
  name: string
  locate: (page: Page, instruction: string) => Locator | null
}> = [
  {
    name: 'getByRole',
    locate: (page, instruction) => {
      const roles = [
        'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
        'menuitem', 'tab', 'switch', 'searchbox', 'spinbutton',
      ] as const
      for (const role of roles) {
        if (instruction.toLowerCase().includes(role)) {
          // Extract the name — words after the role keyword
          const match = instruction.match(new RegExp(`${role}\\s+(.+)`, 'i'))
          const name = match?.[1]?.trim()
          if (name) return page.getByRole(role, { name, exact: false })
          return page.getByRole(role)
        }
      }
      return null
    },
  },
  {
    name: 'getByLabel',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:label|labeled?)\s+["']?(.+?)["']?$/i)
      if (match) return page.getByLabel(match[1], { exact: false })
      return null
    },
  },
  {
    name: 'getByPlaceholder',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:placeholder|field)\s+["']?(.+?)["']?$/i)
      if (match) return page.getByPlaceholder(match[1], { exact: false })
      return null
    },
  },
  {
    name: 'getByText',
    locate: (page, instruction) => {
      // Use last meaningful phrase as text target
      const cleaned = instruction
        .replace(/^(?:click|press|tap|select|choose|open|submit|hit)\s+(?:the\s+)?/i, '')
        .trim()
      if (cleaned) return page.getByText(cleaned, { exact: false })
      return null
    },
  },
  {
    name: 'getByAltText',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:alt|image|img)\s+["']?(.+?)["']?$/i)
      if (match) return page.getByAltText(match[1], { exact: false })
      return null
    },
  },
]

export async function act(page: Page, instruction: string): Promise<ActResult> {
  for (const strategy of strategies) {
    const locator = strategy.locate(page, instruction)
    if (!locator) continue

    try {
      await locator.first().waitFor({ state: 'visible', timeout: 5000 })
      await locator.first().click()
      return {
        success: true,
        method: strategy.name,
        selector: instruction,
      }
    } catch {
      // Try next strategy
    }
  }

  throw new Error(`Could not find element matching: "${instruction}". Use 'a11y' to inspect available elements.`)
}
