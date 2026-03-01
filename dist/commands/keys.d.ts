import type { Page } from 'playwright';
export declare function keys(page: Page, method: 'press' | 'type', value: string, repeat?: number): Promise<{
    method: string;
    value: string;
}>;
//# sourceMappingURL=keys.d.ts.map