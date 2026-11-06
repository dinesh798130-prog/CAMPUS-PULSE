/// <reference types="vite/client" />

/**
 * Campus Pulse API & Backend Integration Configuration
 * Production Base URL: https://campuspulse-backend-trww.onrender.com
 */

const rawBaseUrl =
  (import.meta as any).env?.VITE_API_BASE ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  'https://campuspulse-backend-trww.onrender.com';

export const API_CONFIG = {
  baseUrl: (typeof rawBaseUrl === 'string' ? rawBaseUrl : '').replace(/\/+$/, ''),
  timeoutMs: 10000,

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.length > 0);
  },

  endpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }
};
