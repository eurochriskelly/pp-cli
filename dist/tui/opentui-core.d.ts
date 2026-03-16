export interface CliRendererConfig {
    exitOnCtrlC?: boolean;
    useAlternateScreen?: boolean;
    useMouse?: boolean;
}
export interface CliRendererLike {
    destroy(): void;
}
export interface KeyEventLike {
    name: string;
    eventType?: 'press' | 'repeat' | 'release';
}
export interface SelectOptionLike {
    name: string;
    description: string;
    value?: unknown;
}
export declare const createCliRenderer: (config?: CliRendererConfig) => Promise<CliRendererLike>;
//# sourceMappingURL=opentui-core.d.ts.map