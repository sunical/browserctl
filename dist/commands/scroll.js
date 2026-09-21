export async function scroll(page, direction, percent = 80) {
    const viewportHeight = page.viewportSize()?.height ?? 768;
    const delta = Math.round((viewportHeight * percent) / 100);
    await page.mouse.wheel(0, direction === 'down' ? delta : -delta);
    // The wheel event is dispatched asynchronously and applied by the compositor,
    // so scrollY is often still at its old value when wheel() resolves. Wait for
    // the position to settle — otherwise the snapshot taken right after a scroll
    // can describe the pre-scroll viewport.
    const scrollY = await page
        .evaluate(() => new Promise(resolve => {
        let last = window.scrollY;
        let stableFrames = 0;
        // Cap the wait so a page with continuous scroll animation still returns.
        const deadline = Date.now() + 1000;
        const tick = () => {
            const current = window.scrollY;
            if (current === last) {
                if (++stableFrames >= 3)
                    return resolve(current);
            }
            else {
                stableFrames = 0;
            }
            last = current;
            if (Date.now() > deadline)
                return resolve(current);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }))
        .catch(() => 0);
    return { direction, percent, scrollY };
}
//# sourceMappingURL=scroll.js.map