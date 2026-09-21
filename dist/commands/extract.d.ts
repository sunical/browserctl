import type { Page } from 'playwright';
import { ExtractResult } from '../types.js';
export declare function extract(page: Page, selector?: string, options?: {
    maxChars?: number;
}): Promise<ExtractResult>;
//# sourceMappingURL=extract.d.ts.map