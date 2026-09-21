import type { Page } from 'playwright';
import { A11yResult } from '../types.js';
/**
 * Attribute stamped onto interactive elements so `act <n>` can target the exact
 * node the agent saw in the tree, without re-guessing from a text description.
 */
export declare const REF_ATTR = "data-bctl-ref";
/**
 * Build a compact, interaction-oriented view of the page.
 *
 * Only visible interactive elements get a `[n]` ref; headings are emitted
 * unindexed for orientation. Dumping every DOM node instead costs ~20x the
 * tokens (a Wikipedia article is ~57k tokens as a full tree, ~2.8k here) and
 * the extra nodes are not actionable.
 *
 * Pass `full: true` for the unfiltered tree when a page hides what it does
 * inside non-semantic markup.
 */
export declare function a11y(page: Page, options?: {
    full?: boolean;
}): Promise<A11yResult>;
//# sourceMappingURL=a11y.d.ts.map