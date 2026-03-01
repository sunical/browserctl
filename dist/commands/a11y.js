export async function a11y(page) {
    const tree = await page.evaluate(() => {
        function nodeToText(node, indent) {
            const pad = '  '.repeat(indent);
            const role = node.getAttribute('role') || node.tagName.toLowerCase();
            const name = node.getAttribute('aria-label') ||
                node.getAttribute('alt') ||
                node.getAttribute('placeholder') ||
                node.getAttribute('title') ||
                node.value ||
                node.textContent?.trim().slice(0, 80) ||
                '';
            const disabled = node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true'
                ? ' [disabled]' : '';
            const expanded = node.getAttribute('aria-expanded') !== null
                ? ` [expanded=${node.getAttribute('aria-expanded')}]` : '';
            const checked = node.getAttribute('aria-checked') !== null
                ? ` [checked=${node.getAttribute('aria-checked')}]` : '';
            const label = name ? ` "${name}"` : '';
            let text = `${pad}${role}${label}${disabled}${expanded}${checked}\n`;
            for (const child of Array.from(node.children)) {
                text += nodeToText(child, indent + 1);
            }
            return text;
        }
        return nodeToText(document.body, 0);
    });
    return {
        tree: tree || '(empty)',
        url: page.url(),
    };
}
//# sourceMappingURL=a11y.js.map