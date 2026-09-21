import type { Page } from 'playwright';
export type Args = Record<string, string | number | boolean | undefined>;
export interface CommandSpec {
    /** Whether the command can change the page — decides if an observation follows. */
    mutating: boolean;
    /** Positional argument names, in order, for script parsing. */
    positional: string[];
    /** Args coerced to Number before reaching the handler. */
    numeric?: string[];
    /** Flags that take no value, so the parser does not swallow the next token. */
    booleanFlags?: string[];
    run: (page: Page, args: Args) => Promise<unknown>;
}
export declare const commands: Record<string, CommandSpec>;
export declare function executeCommand(page: Page, name: string, args: Args): Promise<unknown>;
export interface ParsedStep {
    name: string;
    args: Args;
    source: string;
}
/**
 * Parse a batch script such as:
 *   goto example.com; act "click Sign in"; wait --for-selector "#dashboard"
 */
export declare function parseScript(script: string): ParsedStep[];
//# sourceMappingURL=dispatch.d.ts.map