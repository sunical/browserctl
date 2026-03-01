export async function drag(page, x1, y1, x2, y2) {
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 10 });
    await page.mouse.up();
    return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } };
}
//# sourceMappingURL=drag.js.map