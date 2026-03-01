export async function type(page, x, y, text) {
    await page.mouse.click(x, y);
    await page.keyboard.type(text);
    return { text };
}
//# sourceMappingURL=type.js.map