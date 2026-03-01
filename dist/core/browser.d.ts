import { Browser, BrowserContext, Page } from 'playwright';
export interface LaunchOptions {
    headless?: boolean;
    record?: boolean;
}
export interface BrowserInstance {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}
export declare function launch(options?: LaunchOptions): Promise<BrowserInstance>;
export declare function close(instance: BrowserInstance): Promise<void>;
//# sourceMappingURL=browser.d.ts.map