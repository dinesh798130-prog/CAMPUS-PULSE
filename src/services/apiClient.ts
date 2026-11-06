import { API_CONFIG } from '../config/apiConfig';
import { tokenStorage } from './tokenStorage';

export class ApiError extends Error {
  status: number;
  data: any;
  isNetworkError: boolean;
  isAuthError: boolean;

  constructor(message: string, status = 0, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = status === 0;
    this.isAuthError = status === 401;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  requiresAuth?: boolean;
}

export const apiClient = {
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeoutMs = API_CONFIG.timeoutMs,
      requiresAuth = true,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const url = API_CONFIG.endpoint(endpoint);

    // Prepare headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    // Attach Bearer token if requested or available
    if (requiresAuth) {
      const token = await tokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // AbortController for network timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized (session expired or invalid token)
      if (response.status === 401) {
        await tokenStorage.clearAll();
        window.dispatchEvent(new CustomEvent('campus_pulse_session_expired'));
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      // Parse response body
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const errorMessage =
          (data && typeof data === 'object' && (data.message || data.error || data.detail)) ||
          `Request failed with status ${response.status}`;
        throw new ApiError(errorMessage, response.status, data);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new ApiError('Network request timed out. Please check your internet connection.', 0);
      }

      throw new ApiError(
        err.message || 'Unable to connect to the server. Please check your network.',
        0,
        err
      );
    }
  },

  get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  // Health check helper to verify live connection
  async checkHealth(): Promise<{ ok: boolean; status: number; message: string; raw?: any }> {
    try {
      const data = await this.get('/api/health', { requiresAuth: false, timeoutMs: 8000 });
      return { ok: true, status: 200, message: 'Backend healthy', raw: data };
    } catch (err: any) {
      return {
        ok: false,
        status: err.status || 0,
        message: err.message || 'Health check failed',
        raw: err.data
      };
    }
  }
};
