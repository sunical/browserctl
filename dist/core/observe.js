import { a11y } from '../commands/a11y.js';
/**
 * Snapshot the page after a mutating command.
 *
 * Returning this inline is what removes a whole agent turn per interaction:
 * without it every `act`/`click`/`type` has to be followed by a separate
 * `a11y` call, doubling the length of the loop.
 */
export async function observe(page) {
    // Settle just enough to catch a navigation the action kicked off. Capped low
    // on purpose — a slow page should be handled with an explicit
    // `wait --for-selector`, not by taxing every action.
    await page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => { });
    await page
        .evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())))
        .catch(() => { });
    const { tree, url, title, count } = await a11y(page);
    return { url, title, tree, count };
}
//# sourceMappingURL=observe.js.map