import { loadConfig, loadSession } from './config.js';
import { ApiClient } from './api-client.js';
export declare function getApiClient(): Promise<{
    client: ApiClient;
    config: Awaited<ReturnType<typeof loadConfig>>;
    session: Awaited<ReturnType<typeof loadSession>>;
}>;
export declare function assertOutputFormat(format: string | undefined): 'table' | 'json' | 'yaml' | 'csv';
//# sourceMappingURL=helpers.d.ts.map