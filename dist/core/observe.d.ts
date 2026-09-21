import type { Page } from 'playwright';
import { Observation } from '../types.js';
/**
 * Snapshot the page after a mutating command.
 *
 * Returning this inline is what removes a whole agent turn per interaction:
 * without it every `act`/`click`/`type` has to be followed by a separate
 * `a11y` call, doubling the length of the loop.
 */
export declare function observe(page: Page): Promise<Observation>;
//# sourceMappingURL=observe.d.ts.map