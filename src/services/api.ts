/**
 * Central API Client for CampusPulse Web and Mobile
 * - Respects VITE_API_BASE (defaults to empty string for same-origin proxy in development)
 * - Automatically sends credentials: 'include' for web browser session cookies
 * - Automatically attaches X-CSRF-Token for state-changing requests (POST, PUT, PATCH, DELETE)
 * - In Capacitor mobile runtime, reads stored Bearer token from Capacitor Preferences
 *   and sends Authorization: Bearer <token>
 * - Maps API error envelope { error: { code, message } } to thrown Error
 */

import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

let cachedCsrfToken: string | null = null
const TOKEN_STORAGE_KEY = 'campuspulse_bearer_token'

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: TOKEN_STORAGE_KEY })
      return value
    }
  } catch (err) {
    console.warn('Failed to read token from Capacitor Preferences:', err)
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: TOKEN_STORAGE_KEY, value: token })
    }
  } catch (err) {
    console.warn('Failed to write token to Capacitor Preferences:', err)
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export async function clearAuthToken(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: TOKEN_STORAGE_KEY })
    }
  } catch (err) {
    console.warn('Failed to remove token from Capacitor Preferences:', err)
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken

  const baseUrl = import.meta.env.VITE_API_BASE || ''
  try {
    const res = await fetch(`${baseUrl}/api/auth/csrf`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      cachedCsrfToken = data.csrfToken
      return cachedCsrfToken || ''
    }
  } catch (err) {
    console.warn('Failed to retrieve CSRF token:', err)
  }
  return ''
}

export function clearCachedCsrfToken() {
  cachedCsrfToken = null
}

export interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE || ''
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  let url = `${baseUrl}${cleanEndpoint}`

  if (options.params) {
    const searchParams = new URLSearchParams()
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    }
    const queryStr = searchParams.toString()
    if (queryStr) {
      url += (url.includes('?') ? '&' : '?') + queryStr
    }
  }

  const method = (options.method || 'GET').toUpperCase()
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  // 1. Mobile Capacitor support: attach Bearer token if present
  const bearerToken = await getAuthToken()
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  // 2. Web browser support: attach CSRF token on state-changing requests if no Bearer token
  if (isStateChanging && !bearerToken) {
    const csrf = await getCsrfToken()
    if (csrf) {
      headers.set('X-CSRF-Token', csrf)
    }
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })

  // Handle errors
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const err = new Error(
      errorBody.error?.message || `Request failed with status ${res.status}: ${res.statusText}`
    ) as Error & { code?: string; status?: number }
    err.code = errorBody.error?.code || 'HTTP_ERROR'
    err.status = res.status

    if (err.code === 'INVALID_CSRF_TOKEN') {
      clearCachedCsrfToken()
    }

    throw err
  }

  // Handle empty responses
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.text() as Promise<unknown> as Promise<T>
}

export const api = {
  get: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
