import { Browser, BrowserContext, Page } from 'playwright';
export interface Viewport {
    width: number;
    height: number;
}
export interface LaunchOptions {
    headless?: boolean;
    record?: boolean;
    /**
     * Pixels rendered per CSS pixel. 2 gives retina-density screenshots without
     * changing the layout or any coordinate the click/type/drag commands take —
     * those stay in CSS pixels.
     */
    deviceScaleFactor?: number;
    viewport?: Viewport;
}
export declare const DEFAULT_VIEWPORT: Viewport;
export interface BrowserInstance {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}
export declare function launch(options?: LaunchOptions): Promise<BrowserInstance>;
export declare function close(instance: BrowserInstance): Promise<void>;
//# sourceMappingURL=browser.d.ts.map