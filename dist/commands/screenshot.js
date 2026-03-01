import { mkdir, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
const screenshotDir = join(homedir(), '.browserctl', 'screenshots');
export async function screenshot(page, fullPage = true) {
    await mkdir(screenshotDir, { recursive: true });
    const filename = `${Date.now()}.png`;
    const path = join(screenshotDir, filename);
    const buffer = await page.screenshot({ fullPage });
    const base64 = buffer.toString('base64');
    await writeFile(path, buffer);
    return { path, base64 };
}
//# sourceMappingURL=screenshot.js.map