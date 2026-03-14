"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
class ApiClient {
    baseUrl;
    session;
    timeout;
    verbose;
    constructor(baseUrl, session, timeout = 30000, verbose = false) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.session = session;
        this.timeout = timeout;
        this.verbose = verbose;
    }
    log(message, data) {
        if (this.verbose) {
            if (data) {
                console.error(`[DEBUG] ${message}:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
            }
            else {
                console.error(`[DEBUG] ${message}`);
            }
        }
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (this.session?.token) {
            headers['Authorization'] = `Bearer ${this.session.token}`;
        }
        return headers;
    }
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const method = options.method || 'GET';
        const fetchOptions = {
            method,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };
        if (options.body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(options.body);
        }
        this.log(`→ ${method} ${url}`);
        if (options.body) {
            this.log('Request body', options.body);
        }
        try {
            const response = await this.fetchWithTimeout(url, fetchOptions);
            this.log(`← ${response.status} ${response.statusText}`);
            // Handle empty responses
            if (response.status === 204) {
                this.log('Empty response (204)');
                return {};
            }
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType?.includes('application/json')) {
                data = await response.json();
                this.log('Response body', data);
            }
            else {
                const text = await response.text();
                data = text ? { message: text } : {};
                this.log('Response text', text);
            }
            if (!response.ok) {
                const error = {
                    message: data?.message || `HTTP ${response.status}: ${response.statusText}`,
                    status: response.status,
                    details: data
                };
                throw error;
            }
            // Unwrap data if API returns { data: [...] } wrapper
            if (data && typeof data === 'object' && 'data' in data) {
                return data.data;
            }
            return data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'message' in error) {
                throw error;
            }
            const apiError = {
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                code: 'UNKNOWN_ERROR'
            };
            throw apiError;
        }
    }
    // Convenience methods
    get(path, options) {
        return this.request(path, { ...options, method: 'GET' });
    }
    post(path, body, options) {
        return this.request(path, { ...options, method: 'POST', body });
    }
    put(path, body, options) {
        return this.request(path, { ...options, method: 'PUT', body });
    }
    patch(path, body, options) {
        return this.request(path, { ...options, method: 'PATCH', body });
    }
    delete(path, options) {
        return this.request(path, { ...options, method: 'DELETE' });
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=api-client.js.map