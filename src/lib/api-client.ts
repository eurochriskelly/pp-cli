import type { UserSession } from '../types/index.js';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export class ApiClient {
  private baseUrl: string;
  private session: UserSession | null;
  private timeout: number;
  private verbose: boolean;

  constructor(baseUrl: string, session: UserSession | null, timeout = 30000, verbose = false) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.session = session;
    this.timeout = timeout;
    this.verbose = verbose;
  }

  private log(message: string, data?: unknown): void {
    if (this.verbose) {
      if (data) {
        console.error(`[DEBUG] ${message}:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      } else {
        console.error(`[DEBUG] ${message}`);
      }
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.session?.token) {
      headers['Authorization'] = `Bearer ${this.session.token}`;
    }

    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method || 'GET';
    
    const fetchOptions: RequestInit = {
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
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType?.includes('application/json')) {
        data = await response.json();
        this.log('Response body', data);
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
        this.log('Response text', text);
      }

      if (!response.ok) {
        const error: ApiError = {
          message: (data as { message?: string })?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: data
        };
        throw error;
      }

      // Unwrap data if API returns { data: [...] } wrapper
      if (data && typeof data === 'object' && 'data' in data) {
        return (data as { data: T }).data;
      }

      return data as T;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }
      
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'UNKNOWN_ERROR'
      };
      throw apiError;
    }
  }

  // Convenience methods
  get<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
