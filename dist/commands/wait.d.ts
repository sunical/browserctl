import type { Page } from 'playwright';
import { WaitCondition, WaitResult } from '../types.js';
/** Fixed sleep. Kept for back-compat; prefer waitFor() with a real condition. */
export declare function wait(ms: number): Promise<{
    waited: number;
}>;
/**
 * Wait for an actual page condition rather than a guessed duration.
 *
 * A fixed `wait 1000` is either too short (the agent burns a turn retrying) or
 * too long (dead time on every run). Conditions return the moment they are
 * satisfied.
 */
export declare function waitFor(page: Page, condition: WaitCondition, timeout?: number): Promise<WaitResult>;
/** Build a condition from CLI flags; throws if the flags are contradictory. */
export declare function parseWaitCondition(args: {
    ms?: number;
    forSelector?: string;
    forText?: string;
    forGone?: string;
    forNetworkIdle?: boolean;
    forNavigation?: boolean;
}): WaitCondition;
//# sourceMappingURL=wait.d.ts.map