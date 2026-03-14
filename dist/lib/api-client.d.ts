import type { UserSession } from '../types/index.js';
interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
}
export declare class ApiClient {
    private baseUrl;
    private session;
    private timeout;
    private verbose;
    constructor(baseUrl: string, session: UserSession | null, timeout?: number, verbose?: boolean);
    private log;
    private getHeaders;
    private fetchWithTimeout;
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    get<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T>;
    post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
    put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
    patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
    delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T>;
}
export {};
//# sourceMappingURL=api-client.d.ts.map