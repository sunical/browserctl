export async function extract(page, selector) {
    // A navigation kicked off by the previous command may still be in flight, in
    // which case the new document has no body yet and innerText throws.
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
    let text;
    if (selector) {
        const elements = await page.locator(selector).allTextContents();
        text = elements.join('\n').trim();
    }
    else {
        text = await page.evaluate(() => document.body?.innerText ?? '');
    }
    return {
        text,
        url: page.url(),
    };
}
//# sourceMappingURL=extract.js.map