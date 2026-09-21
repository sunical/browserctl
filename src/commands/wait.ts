import type { Page } from 'playwright'
import { WaitCondition, WaitResult } from '../types.js'

const DEFAULT_TIMEOUT_MS = 30_000

/** Fixed sleep. Kept for back-compat; prefer waitFor() with a real condition. */
export async function wait(ms: number): Promise<{ waited: number }> {
  await new Promise(resolve => setTimeout(resolve, ms))
  return { waited: ms }
}

/**
 * Wait for an actual page condition rather than a guessed duration.
 *
 * A fixed `wait 1000` is either too short (the agent burns a turn retrying) or
 * too long (dead time on every run). Conditions return the moment they are
 * satisfied.
 */
export async function waitFor(
  page: Page,
  condition: WaitCondition,
  timeout = DEFAULT_TIMEOUT_MS
): Promise<WaitResult> {
  const start = Date.now()

  switch (condition.kind) {
    case 'ms':
      await new Promise(resolve => setTimeout(resolve, condition.ms))
      return { waited: Date.now() - start, condition: `${condition.ms}ms` }

    case 'selector':
      await page.locator(condition.selector).first().waitFor({ state: 'visible', timeout })
      return { waited: Date.now() - start, condition: `selector "${condition.selector}" visible` }

    case 'gone':
      await page.locator(condition.selector).first().waitFor({ state: 'hidden', timeout })
      return { waited: Date.now() - start, condition: `selector "${condition.selector}" gone` }

    case 'text':
      await page.getByText(condition.text, { exact: false }).first().waitFor({ state: 'visible', timeout })
      return { waited: Date.now() - start, condition: `text "${condition.text}" visible` }

    case 'networkIdle':
      await page.waitForLoadState('networkidle', { timeout })
      return { waited: Date.now() - start, condition: 'network idle' }

    case 'navigation':
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout })
      return { waited: Date.now() - start, condition: 'navigation' }
  }
}

/** Build a condition from CLI flags; throws if the flags are contradictory. */
export function parseWaitCondition(args: {
  ms?: number
  forSelector?: string
  forText?: string
  forGone?: string
  forNetworkIdle?: boolean
  forNavigation?: boolean
}): WaitCondition {
  const chosen: WaitCondition[] = []

  if (args.forSelector) chosen.push({ kind: 'selector', selector: args.forSelector })
  if (args.forGone) chosen.push({ kind: 'gone', selector: args.forGone })
  if (args.forText) chosen.push({ kind: 'text', text: args.forText })
  if (args.forNetworkIdle) chosen.push({ kind: 'networkIdle' })
  if (args.forNavigation) chosen.push({ kind: 'navigation' })

  if (chosen.length > 1) {
    throw new Error('Specify only one wait condition')
  }
  if (chosen.length === 1) return chosen[0]

  if (args.ms === undefined || Number.isNaN(args.ms)) {
    throw new Error(
      'wait needs a duration or a condition, e.g. "wait 500" or "wait --for-selector .results"'
    )
  }
  return { kind: 'ms', ms: args.ms }
}
