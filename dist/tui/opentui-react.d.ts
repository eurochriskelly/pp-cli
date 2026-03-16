import type { ReactNode } from 'react';
import type { CliRendererLike, KeyEventLike } from './opentui-core.js';
export interface RootLike {
    render(node: ReactNode): void;
    unmount(): void;
}
export declare const createRoot: (renderer: CliRendererLike) => RootLike, useKeyboard: (handler: (key: KeyEventLike) => void, options?: {
    release?: boolean;
}) => void, useRenderer: () => CliRendererLike;
//# sourceMappingURL=opentui-react.d.ts.map