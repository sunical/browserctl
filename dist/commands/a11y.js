/**
 * Attribute stamped onto interactive elements so `act <n>` can target the exact
 * node the agent saw in the tree, without re-guessing from a text description.
 */
export const REF_ATTR = 'data-bctl-ref';
const MAX_NAME_LEN = 80;
/**
 * Build a compact, interaction-oriented view of the page.
 *
 * Only visible interactive elements get a `[n]` ref; headings are emitted
 * unindexed for orientation. Dumping every DOM node instead costs ~20x the
 * tokens (a Wikipedia article is ~57k tokens as a full tree, ~2.8k here) and
 * the extra nodes are not actionable.
 *
 * Pass `full: true` for the unfiltered tree when a page hides what it does
 * inside non-semantic markup.
 */
/**
 * Scan one frame. Frames are separate execution contexts, so each has to be
 * evaluated on its own — a page selector cannot reach across an iframe
 * boundary the way it can across an open shadow root.
 */
async function scanFrame(frame, options) {
    return frame.evaluate(({ refAttr, full, maxNameLen, startRef }) => {
        const INTERACTIVE = [
            'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
            '[role]', '[onclick]', '[contenteditable="true"]',
            '[tabindex]:not([tabindex="-1"])',
        ].join(',');
        const ROLE_BY_TAG = {
            a: 'link', button: 'button', select: 'combobox', textarea: 'textbox',
            summary: 'disclosure', h1: 'heading', h2: 'heading', h3: 'heading',
            h4: 'heading', h5: 'heading', h6: 'heading',
        };
        const INPUT_ROLES = {
            checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button',
            reset: 'button', image: 'button', search: 'searchbox', range: 'slider',
            number: 'spinbutton', file: 'file', hidden: 'hidden',
        };
        /**
         * querySelectorAll stops at shadow boundaries, so a page built from web
         * components reports almost nothing — while Playwright's selectors pierce
         * open shadow roots and can click those very elements.
         */
        function queryDeep(root, selector) {
            const found = [];
            const visit = (node) => {
                for (const el of Array.from(node.children)) {
                    if (el.matches(selector))
                        found.push(el);
                    // Host first, then its shadow content, then its light children —
                    // slotted nodes live in the light tree, so nothing is visited twice.
                    if (el.shadowRoot)
                        visit(el.shadowRoot);
                    visit(el);
                }
            };
            visit(root);
            return found;
        }
        function isVisible(el) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return false;
            const style = getComputedStyle(el);
            return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
        }
        function clean(text) {
            if (!text)
                return '';
            const collapsed = text.replace(/\s+/g, ' ').trim();
            return collapsed.length > maxNameLen ? collapsed.slice(0, maxNameLen) + '…' : collapsed;
        }
        function roleOf(el) {
            const explicit = el.getAttribute('role');
            if (explicit)
                return explicit;
            const tag = el.tagName.toLowerCase();
            if (tag === 'input') {
                const type = el.type?.toLowerCase() ?? 'text';
                return INPUT_ROLES[type] ?? 'textbox';
            }
            return ROLE_BY_TAG[tag] ?? tag;
        }
        /** Accessible name, in roughly the order the ARIA spec resolves it. */
        function nameOf(el) {
            const label = el.getAttribute('aria-label');
            if (label)
                return clean(label);
            // ids are scoped to the containing shadow root, not the document.
            const root = el.getRootNode();
            const labelledBy = el.getAttribute('aria-labelledby');
            if (labelledBy) {
                const parts = labelledBy
                    .split(/\s+/)
                    .map(id => root.getElementById?.(id)?.textContent ?? '')
                    .filter(Boolean);
                if (parts.length)
                    return clean(parts.join(' '));
            }
            const tag = el.tagName.toLowerCase();
            if (tag === 'input' || tag === 'select' || tag === 'textarea') {
                const id = el.getAttribute('id');
                if (id) {
                    // CSS.escape keeps ids containing ":" or "." from breaking the selector
                    const forLabel = root.querySelector(`label[for="${CSS.escape(id)}"]`);
                    if (forLabel?.textContent)
                        return clean(forLabel.textContent);
                }
                const wrapping = el.closest('label');
                if (wrapping?.textContent)
                    return clean(wrapping.textContent);
            }
            const alt = el.getAttribute('alt');
            if (alt)
                return clean(alt);
            const placeholder = el.getAttribute('placeholder');
            if (placeholder)
                return clean(placeholder);
            const title = el.getAttribute('title');
            if (title)
                return clean(title);
            if (tag === 'input') {
                const type = el.type?.toLowerCase();
                // Only button-ish inputs are named by their value; for text inputs the
                // value is content, and is reported separately below.
                if (type === 'submit' || type === 'button' || type === 'reset') {
                    return clean(el.value);
                }
                return '';
            }
            // A form control with no label has no name. Its text content is its
            // options or its value, not a label, so falling through would produce
            // junk like combobox "Free Pro".
            if (tag === 'select' || tag === 'textarea')
                return '';
            // innerText (not textContent) so hidden descendant text stays out.
            return clean(el.innerText);
        }
        function statesOf(el) {
            const out = [];
            const tag = el.tagName.toLowerCase();
            if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
                out.push('disabled');
            }
            if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true') {
                out.push('required');
            }
            const expanded = el.getAttribute('aria-expanded');
            if (expanded !== null)
                out.push(`expanded=${expanded}`);
            const selected = el.getAttribute('aria-selected');
            if (selected !== null)
                out.push(`selected=${selected}`);
            if (tag === 'input') {
                const input = el;
                const type = input.type?.toLowerCase();
                if (type === 'checkbox' || type === 'radio') {
                    if (input.checked)
                        out.push('checked');
                }
                else if (input.value) {
                    out.push(`value="${clean(input.value)}"`);
                }
                if (type && type !== 'text')
                    out.push(`type=${type}`);
            }
            else if (tag === 'textarea') {
                const value = el.value;
                if (value)
                    out.push(`value="${clean(value)}"`);
            }
            else if (tag === 'select') {
                const select = el;
                const chosen = select.selectedOptions?.[0]?.textContent;
                if (chosen)
                    out.push(`value="${clean(chosen)}"`);
            }
            else {
                const checked = el.getAttribute('aria-checked');
                if (checked !== null)
                    out.push(`checked=${checked}`);
            }
            return out.length ? ' ' + out.join(' ') : '';
        }
        // Drop refs from a previous snapshot so indices never collide with stale ones.
        for (const stale of queryDeep(document, `[${refAttr}]`)) {
            stale.removeAttribute(refAttr);
        }
        if (!document.body)
            return { lines: [], count: 0 };
        if (full) {
            const walk = (node, depth) => {
                // nameOf() reads innerText, which forces layout — call it once.
                const name = nameOf(node);
                let out = `${'  '.repeat(depth)}${roleOf(node)}${name ? ` "${name}"` : ''}\n`;
                if (node.shadowRoot) {
                    for (const child of Array.from(node.shadowRoot.children))
                        out += walk(child, depth + 1);
                }
                for (const child of Array.from(node.children))
                    out += walk(child, depth + 1);
                return out;
            };
            return { lines: walk(document.body, 0).split('\n').filter(Boolean), count: 0 };
        }
        // One ordered pass so interactive elements and headings interleave in
        // document order — the agent reads the page the way a person would.
        const candidates = queryDeep(document.body, `${INTERACTIVE},h1,h2,h3,h4,h5,h6`);
        const lines = [];
        let ref = startRef;
        for (const el of candidates) {
            if (!isVisible(el))
                continue;
            const role = roleOf(el);
            if (role === 'hidden' || role === 'presentation' || role === 'none')
                continue;
            const name = nameOf(el);
            const tag = el.tagName.toLowerCase();
            const isHeading = /^h[1-6]$/.test(tag);
            if (isHeading && !el.matches(INTERACTIVE)) {
                // Context only — not actionable, so no ref.
                if (name)
                    lines.push(`${'#'.repeat(Number(tag[1]))} ${name}`);
                continue;
            }
            // An unnamed, stateless control is noise the agent cannot act on.
            const states = statesOf(el);
            if (!name && !states)
                continue;
            el.setAttribute(refAttr, String(ref));
            lines.push(`[${ref}] ${role}${name ? ` "${name}"` : ''}${states}`);
            ref++;
        }
        return { lines, count: ref - startRef };
    }, { refAttr: REF_ATTR, full: options.full, maxNameLen: MAX_NAME_LEN, startRef: options.startRef });
}
/** Short, stable label for an iframe so the agent knows which document it is in. */
function frameLabel(frame, index) {
    const url = frame.url();
    if (!url || url === 'about:blank')
        return `iframe ${index}`;
    if (url.startsWith('about:'))
        return `iframe ${index} (${url})`;
    try {
        const { host, pathname } = new URL(url);
        const path = pathname.length > 30 ? pathname.slice(0, 30) + '…' : pathname;
        return `iframe ${index} (${host}${path === '/' ? '' : path})`;
    }
    catch {
        return `iframe ${index}`;
    }
}
export async function a11y(page, options = {}) {
    // Same reason as extract(): mid-navigation there is no body to walk.
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
    const full = options.full ?? false;
    const main = page.mainFrame();
    const sections = [];
    let ref = 0;
    let iframeIndex = 0;
    for (const frame of page.frames()) {
        const isMain = frame === main;
        if (!isMain)
            iframeIndex++;
        // A frame can detach mid-scan, and a still-loading one has nothing to read.
        const result = await scanFrame(frame, { full, startRef: ref }).catch(() => null);
        if (!result || result.lines.length === 0)
            continue;
        if (!isMain)
            sections.push(`--- ${frameLabel(frame, iframeIndex)} ---`);
        sections.push(...result.lines);
        ref += result.count;
    }
    const tree = sections.join('\n').trim();
    return {
        tree: tree || '(no interactive elements found — try --full)',
        url: page.url(),
        title: await page.title().catch(() => ''),
        count: ref,
    };
}
//# sourceMappingURL=a11y.js.map