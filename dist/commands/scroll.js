export async function scroll(page, direction, percent = 80) {
    const viewportHeight = page.viewportSize()?.height ?? 768;
    const delta = Math.round((viewportHeight * percent) / 100);
    await page.mouse.wheel(0, direction === 'down' ? delta : -delta);
    return { direction, percent };
}
//# sourceMappingURL=scroll.js.map