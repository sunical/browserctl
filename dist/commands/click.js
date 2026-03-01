export async function click(page, x, y) {
    await page.mouse.click(x, y);
    return { x, y };
}
//# sourceMappingURL=click.js.map