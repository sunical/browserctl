export async function extract(page, selector) {
    let text;
    if (selector) {
        const elements = await page.locator(selector).allTextContents();
        text = elements.join('\n').trim();
    }
    else {
        text = await page.evaluate(() => document.body.innerText);
    }
    return {
        text,
        url: page.url(),
    };
}
//# sourceMappingURL=extract.js.map