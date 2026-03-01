export async function goto(page, url) {
    // Prepend https:// if no protocol given
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    return { url: page.url() };
}
//# sourceMappingURL=goto.js.map