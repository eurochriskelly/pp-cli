import type { OutputFormat } from '../types/index.js';
export interface FormatterOptions {
    format: OutputFormat;
    headers?: string[];
}
export declare function formatOutput(data: unknown, options: FormatterOptions): string;
//# sourceMappingURL=formatters.d.ts.map