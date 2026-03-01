import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
const videoDir = join(homedir(), '.browserctl', 'videos');
export async function launch(options = {}) {
    const browser = await chromium.launch({
        headless: options.headless ?? true,
    });
    const contextOptions = options.record
        ? { recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } } }
        : {};
    if (options.record) {
        await mkdir(videoDir, { recursive: true });
    }
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    return { browser, context, page };
}
export async function close(instance) {
    await instance.context.close().catch(() => { });
    await instance.browser.close().catch(() => { });
}
//# sourceMappingURL=browser.js.map