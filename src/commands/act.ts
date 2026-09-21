import type { Page, Frame, Locator } from 'playwright'
import { ActResult } from '../types.js'
import { a11y, REF_ATTR } from './a11y.js'

interface Match {
  locator: Locator
  /**
   * Set when the instruction named no specific element. Such a match is only
   * safe if exactly one candidate exists — otherwise we would silently click
   * an arbitrary one.
   */
  requireUnique?: boolean
}

// Strategies tried in order. Each returns a locator if it can handle the instruction.
const strategies: Array<{
  name: string
  locate: (page: Page, instruction: string) => Match | null
}> = [
  {
    name: 'getByRole',
    locate: (page, instruction) => {
      const roles = [
        'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
        'menuitem', 'tab', 'switch', 'searchbox', 'spinbutton',
      ] as const
      for (const role of roles) {
        // Word boundaries matter: a bare `includes` treats "click NoSuchButton"
        // as a request for role=button and then clicks the page's first button.
        if (!new RegExp(`\\b${role}\\b`, 'i').test(instruction)) continue

        // Extract the name — words after the role keyword
        const match = instruction.match(new RegExp(`\\b${role}\\b\\s+(.+)`, 'i'))
        const name = match?.[1]?.trim()
        if (name) return { locator: page.getByRole(role, { name, exact: false }) }
        return { locator: page.getByRole(role), requireUnique: true }
      }
      return null
    },
  },
  {
    name: 'getByLabel',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:label|labeled?)\s+["']?(.+?)["']?$/i)
      if (match) return { locator: page.getByLabel(match[1], { exact: false }) }
      return null
    },
  },
  {
    name: 'getByPlaceholder',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:placeholder|field)\s+["']?(.+?)["']?$/i)
      if (match) return { locator: page.getByPlaceholder(match[1], { exact: false }) }
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
      if (cleaned) return { locator: page.getByText(cleaned, { exact: false }) }
      return null
    },
  },
  {
    name: 'getByAltText',
    locate: (page, instruction) => {
      const match = instruction.match(/(?:alt|image|img)\s+["']?(.+?)["']?$/i)
      if (match) return { locator: page.getByAltText(match[1], { exact: false }) }
      return null
    },
  },
]

/** `3`, `[3]`, or `click [3]` all mean "the element a11y labelled [3]". */
function parseRef(instruction: string): number | null {
  const match = instruction.trim().match(/^(?:\w+\s+)?\[?(\d+)\]?$/)
  if (!match) return null
  return Number(match[1])
}

export async function act(page: Page, instruction: string): Promise<ActResult> {
  const ref = parseRef(instruction)

  // An explicit ref is exact — no guessing, and no wasted turn when the
  // description-matching heuristics below would have picked the wrong node.
  if (ref !== null) {
    const selector = `[${REF_ATTR}="${ref}"]`

    // Refs can live in any frame, and a page selector cannot cross an iframe
    // boundary — so ask each frame. count() resolves immediately; locator
    // .evaluate() would block for the full 30s action timeout when the ref is
    // absent, turning a clear error into a hang.
    const findFrame = async (): Promise<Frame | null> => {
      for (const frame of page.frames()) {
        const hit = await frame.locator(selector).count().catch(() => 0)
        if (hit > 0) return frame
      }
      return null
    }

    let frame = await findFrame()

    if (!frame) {
      // No snapshot has stamped this page yet — happens inside a `run` script,
      // where intermediate pages are never observed. Index it now so the ref
      // means "nth interactive element here", the same order a11y reports.
      const stamped = await Promise.all(
        page.frames().map(f => f.locator(`[${REF_ATTR}]`).count().catch(() => 0))
      )
      if (stamped.every(n => n === 0)) {
        await a11y(page)
        frame = await findFrame()
      }
    }

    if (!frame) {
      throw new Error(
        `No element with ref [${ref}] on this page. Refs come from the page snapshot and ` +
          `are invalidated by navigation or re-render — run 'a11y' again for current refs.`
      )
    }

    const locator = frame.locator(selector).first()
    const description = await locator
      .evaluate(el => `${el.tagName.toLowerCase()} "${(el as HTMLElement).innerText?.trim().slice(0, 40) ?? ''}"`)
      .catch(() => `ref [${ref}]`)

    await locator.click()
    return { success: true, method: 'ref', selector, target: description }
  }

  for (const strategy of strategies) {
    const match = strategy.locate(page, instruction)
    if (!match) continue

    try {
      await match.locator.first().waitFor({ state: 'visible', timeout: 5000 })

      if (match.requireUnique && (await match.locator.count()) > 1) {
        // Ambiguous, and the instruction gave us nothing to disambiguate with.
        continue
      }

      await match.locator.first().click()
      return {
        success: true,
        method: strategy.name,
        selector: instruction,
        target: instruction,
      }
    } catch {
      // Try next strategy
    }
  }

  throw new Error(
    `Could not find element matching: "${instruction}". Run 'a11y' and target the element ` +
      `by its ref instead, e.g. 'act 3'.`
  )
}
