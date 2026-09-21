import { screenshot } from '../commands/screenshot.js';
import { a11y } from '../commands/a11y.js';
import { goto } from '../commands/goto.js';
import { act } from '../commands/act.js';
import { click } from '../commands/click.js';
import { type as typeCmd } from '../commands/type.js';
import { scroll } from '../commands/scroll.js';
import { extract } from '../commands/extract.js';
import { keys } from '../commands/keys.js';
import { waitFor, parseWaitCondition } from '../commands/wait.js';
import { back } from '../commands/back.js';
import { drag } from '../commands/drag.js';
import { fillform, parseFields } from '../commands/fillform.js';
import { think } from '../commands/think.js';
const str = (v) => (v === undefined ? '' : String(v));
const num = (v) => Number(v);
export const commands = {
    goto: {
        mutating: true,
        positional: ['url'],
        run: (page, a) => goto(page, str(a.url)),
    },
    back: {
        mutating: true,
        positional: [],
        run: page => back(page),
    },
    act: {
        mutating: true,
        positional: ['instruction'],
        run: (page, a) => act(page, str(a.instruction)),
    },
    click: {
        mutating: true,
        positional: ['x', 'y'],
        numeric: ['x', 'y'],
        run: (page, a) => click(page, num(a.x), num(a.y)),
    },
    type: {
        mutating: true,
        positional: ['x', 'y', 'text'],
        numeric: ['x', 'y'],
        run: (page, a) => typeCmd(page, num(a.x), num(a.y), str(a.text)),
    },
    keys: {
        mutating: true,
        positional: ['method', 'value'],
        numeric: ['repeat'],
        run: (page, a) => keys(page, str(a.method), str(a.value), a.repeat ? num(a.repeat) : 1),
    },
    scroll: {
        mutating: true,
        positional: ['direction'],
        numeric: ['percent'],
        run: (page, a) => scroll(page, str(a.direction), a.percent ? num(a.percent) : 80),
    },
    drag: {
        mutating: true,
        positional: ['x1', 'y1', 'x2', 'y2'],
        numeric: ['x1', 'y1', 'x2', 'y2'],
        run: (page, a) => drag(page, num(a.x1), num(a.y1), num(a.x2), num(a.y2)),
    },
    fillform: {
        mutating: true,
        positional: ['fields'],
        run: (page, a) => fillform(page, typeof a.fields === 'string' ? parseFields(a.fields) : a.fields),
    },
    wait: {
        // A wait does not itself change the page, but it is used precisely because
        // the page is expected to change, so an observation afterwards is useful.
        mutating: true,
        positional: ['ms'],
        numeric: ['ms', 'timeout'],
        booleanFlags: ['for-network-idle', 'for-navigation'],
        run: (page, a) => waitFor(page, parseWaitCondition({
            ms: a.ms === undefined ? undefined : num(a.ms),
            forSelector: a['for-selector'],
            forText: a['for-text'],
            forGone: a['for-gone'],
            forNetworkIdle: a['for-network-idle'] === true,
            forNavigation: a['for-navigation'] === true,
        }), a.timeout ? num(a.timeout) : undefined),
    },
    a11y: {
        mutating: false,
        positional: [],
        booleanFlags: ['full'],
        run: (page, a) => a11y(page, { full: a.full === true }),
    },
    extract: {
        mutating: false,
        positional: [],
        run: (page, a) => extract(page, a.selector),
    },
    screenshot: {
        mutating: false,
        positional: [],
        booleanFlags: ['no-full-page', 'base64'],
        run: (page, a) => screenshot(page, a['no-full-page'] !== true, { base64: a.base64 === true }),
    },
    think: {
        mutating: false,
        positional: ['reasoning'],
        run: async (_page, a) => think(str(a.reasoning)),
    },
};
export async function executeCommand(page, name, args) {
    const spec = commands[name];
    if (!spec) {
        throw new Error(`Unknown command: "${name}". Known: ${Object.keys(commands).join(', ')}`);
    }
    return spec.run(page, args);
}
/** Split a token stream on quotes and whitespace, the way a shell would. */
function tokenize(input) {
    const tokens = [];
    let current = '';
    let quote = null;
    let started = false;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (quote) {
            if (char === '\\' && input[i + 1] === quote) {
                current += quote;
                i++;
            }
            else if (char === quote) {
                quote = null;
            }
            else {
                current += char;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            started = true;
            continue;
        }
        if (/\s/.test(char)) {
            if (started)
                tokens.push(current);
            current = '';
            started = false;
            continue;
        }
        current += char;
        started = true;
    }
    if (quote)
        throw new Error(`Unterminated ${quote} quote in: ${input}`);
    if (started)
        tokens.push(current);
    return tokens;
}
/** Split a script into steps on `;` and newlines, respecting quotes. */
function splitSteps(script) {
    const steps = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < script.length; i++) {
        const char = script[i];
        if (quote) {
            if (char === '\\' && script[i + 1] === quote) {
                current += char + quote;
                i++;
            }
            else {
                if (char === quote)
                    quote = null;
                current += char;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }
        if (char === ';' || char === '\n') {
            if (current.trim())
                steps.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (quote)
        throw new Error(`Unterminated ${quote} quote in script`);
    if (current.trim())
        steps.push(current.trim());
    return steps;
}
/**
 * Parse a batch script such as:
 *   goto example.com; act "click Sign in"; wait --for-selector "#dashboard"
 */
export function parseScript(script) {
    return splitSteps(script).map(source => {
        const tokens = tokenize(source);
        const name = tokens.shift();
        if (!name)
            throw new Error(`Empty step in script: "${source}"`);
        const spec = commands[name];
        if (!spec) {
            throw new Error(`Unknown command "${name}" in step: "${source}". Known: ${Object.keys(commands).join(', ')}`);
        }
        const args = {};
        const positional = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.startsWith('--')) {
                const eq = token.indexOf('=');
                const flag = eq === -1 ? token.slice(2) : token.slice(2, eq);
                if (eq !== -1) {
                    args[flag] = token.slice(eq + 1);
                }
                else if (spec.booleanFlags?.includes(flag)) {
                    args[flag] = true;
                }
                else {
                    const next = tokens[i + 1];
                    if (next === undefined || next.startsWith('--')) {
                        args[flag] = true;
                    }
                    else {
                        args[flag] = next;
                        i++;
                    }
                }
                continue;
            }
            positional.push(token);
        }
        // Trailing positionals collapse into the last slot, so an unquoted
        // `act click Sign in` still works.
        spec.positional.forEach((argName, index) => {
            if (index === spec.positional.length - 1 && positional.length > spec.positional.length) {
                args[argName] = positional.slice(index).join(' ');
            }
            else if (positional[index] !== undefined) {
                args[argName] = positional[index];
            }
        });
        for (const key of spec.numeric ?? []) {
            if (args[key] === undefined)
                continue;
            const value = Number(args[key]);
            if (Number.isNaN(value)) {
                // Silently passing NaN through surfaces later as an opaque Playwright
                // error pointing at the wrong thing.
                throw new Error(`Expected a number for "${key}" in step: "${source}", got "${args[key]}"`);
            }
            args[key] = value;
        }
        return { name, args, source };
    });
}
//# sourceMappingURL=dispatch.js.map