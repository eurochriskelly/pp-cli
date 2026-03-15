#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
function getNodeMajorVersion() {
    return Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
}
async function main() {
    const nodeMajor = getNodeMajorVersion();
    if (nodeMajor >= 25) {
        console.error([
            'The OpenTUI runtime currently does not start cleanly under Node 25 in this environment.',
            'Use Node 20 or Node 22 to launch `ppx-tui`, then rebuild with `npm run build`.'
        ].join(' '));
        process.exitCode = 1;
        return;
    }
    const cliEntry = node_path_1.default.resolve(__dirname, 'index.js');
    const React = await import('react');
    const { createCliRenderer } = await import('./tui/opentui-core.js');
    const { createRoot } = await import('./tui/opentui-react.js');
    const { App } = await import('./tui/app.js');
    const renderer = await createCliRenderer({
        exitOnCtrlC: true,
        useAlternateScreen: true,
        useMouse: true
    });
    const root = createRoot(renderer);
    root.render(React.createElement(App, { cliEntry }));
}
void main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exit(1);
});
//# sourceMappingURL=tui.js.map