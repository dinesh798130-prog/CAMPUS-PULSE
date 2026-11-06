import { Role } from '../types';
import { api, setAuthToken, clearAuthToken } from './api';

export interface UserSession {
  id: string;
  role: Role;
  name: string;
  email: string;
  identifier: string; // Registration number or Faculty ID
  departmentId?: string;
  sectionId?: string;
  avatarUrl?: string;
  group?: string | null;
}

const AUTH_KEY = 'campus_pulse_session_v1';

export const authService = {
  getCurrentSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as UserSession;
    } catch {
      return null;
    }
  },

  async login(emailInput: string, passwordInput: string): Promise<UserSession> {
    const data = await api.post<{ user: any; token?: string; expiresAt?: string }>('/api/auth/login', {
      email: emailInput.trim(),
      password: passwordInput
    });

    if (data.token) {
      await setAuthToken(data.token);
    }

    const user = data.user;
    const session: UserSession = {
      id: user.id,
      role: user.role as Role,
      name: user.name,
      email: user.email,
      identifier: user.group || user.facultyId || user.id,
      group: user.group,
      departmentId: user.group ? 'ACSE' : undefined,
      sectionId: user.group || undefined
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return session;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout', {});
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    await clearAuthToken();
    localStorage.removeItem(AUTH_KEY);
  },

  async checkServerSession(): Promise<UserSession | null> {
    try {
      const data = await api.get<{ user: any }>('/api/auth/me');
      const user = data.user;
      const session: UserSession = {
        id: user.id,
        role: user.role as Role,
        name: user.name,
        email: user.email,
        identifier: user.group || user.facultyId || user.id,
        group: user.group,
        departmentId: user.group ? 'ACSE' : undefined,
        sectionId: user.group || undefined
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return session;
    } catch {
      await clearAuthToken();
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  },

  hasRole(role: Role): boolean {
    const session = this.getCurrentSession();
    return session?.role === role;
  }
};
