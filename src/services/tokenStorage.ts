import { Preferences } from '@capacitor/preferences';
import { UserSession } from '../types';

const TOKEN_KEY = 'cp_auth_token';
const SESSION_KEY = 'cp_user_session';

/**
 * Secure token & session persistence using Capacitor Preferences
 * Compatible with Android native storage and standard web fallback
 */
export const tokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      return value || null;
    } catch {
      return localStorage.getItem(TOKEN_KEY);
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    } catch {
      // Fallback
    }
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },

  async clearToken(): Promise<void> {
    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch {}
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },

  async getSession(): Promise<UserSession | null> {
    try {
      const { value } = await Preferences.get({ key: SESSION_KEY });
      if (value) return JSON.parse(value);
    } catch {}
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setSession(session: UserSession): Promise<void> {
    const val = JSON.stringify(session);
    try {
      await Preferences.set({ key: SESSION_KEY, value: val });
    } catch {}
    try {
      localStorage.setItem(SESSION_KEY, val);
    } catch {}
  },

  async clearSession(): Promise<void> {
    try {
      await Preferences.remove({ key: SESSION_KEY });
    } catch {}
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  },

  async clearAll(): Promise<void> {
    await this.clearToken();
    await this.clearSession();
  }
};
