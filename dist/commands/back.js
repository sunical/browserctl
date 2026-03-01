export async function back(page) {
    await page.goBack({ waitUntil: 'domcontentloaded' });
    return { url: page.url() };
}
//# sourceMappingURL=back.js.map