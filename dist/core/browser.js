import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { VIDEO_DIR } from './config.js';
const videoDir = VIDEO_DIR;
export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
export async function launch(options = {}) {
    const browser = await chromium.launch({
        headless: options.headless ?? true,
    });
    const viewport = options.viewport ?? DEFAULT_VIEWPORT;
    if (options.record) {
        await mkdir(videoDir, { recursive: true });
    }
    const context = await browser.newContext({
        viewport,
        deviceScaleFactor: options.deviceScaleFactor,
        // Record at the viewport's own size rather than a fixed 720p.
        ...(options.record ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
    });
    const page = await context.newPage();
    return { browser, context, page };
}
export async function close(instance) {
    await instance.context.close().catch(() => { });
    await instance.browser.close().catch(() => { });
}
//# sourceMappingURL=browser.js.map