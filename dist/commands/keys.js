export async function keys(page, method, value, repeat = 1) {
    if (method === 'press') {
        for (let i = 0; i < repeat; i++) {
            await page.keyboard.press(value);
        }
    }
    else {
        await page.keyboard.type(value);
    }
    return { method, value };
}
//# sourceMappingURL=keys.js.map