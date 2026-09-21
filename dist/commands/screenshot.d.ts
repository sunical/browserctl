import type { Page } from 'playwright';
import { ScreenshotResult } from '../types.js';
export declare function screenshot(page: Page, fullPage?: boolean, options?: {
    base64?: boolean;
}): Promise<ScreenshotResult>;
//# sourceMappingURL=screenshot.d.ts.map