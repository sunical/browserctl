import type { Page } from 'playwright';
import { A11yResult } from '../types.js';
/**
 * Attribute stamped onto interactive elements so `act <n>` can target the exact
 * node the agent saw in the tree, without re-guessing from a text description.
 */
export declare const REF_ATTR = "data-bctl-ref";
export declare function a11y(page: Page, options?: {
    full?: boolean;
}): Promise<A11yResult>;
//# sourceMappingURL=a11y.d.ts.map