import type { Page } from 'playwright';
export declare function scroll(page: Page, direction: 'up' | 'down', percent?: number): Promise<{
    direction: string;
    percent: number;
    scrollY: number;
}>;
//# sourceMappingURL=scroll.d.ts.map