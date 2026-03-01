import type { Page } from 'playwright';
export interface FormField {
    field: string;
    value: string;
}
export declare function fillform(page: Page, fields: FormField[]): Promise<{
    filled: number;
}>;
export declare function parseFields(raw: string): FormField[];
//# sourceMappingURL=fillform.d.ts.map