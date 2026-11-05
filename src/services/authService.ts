import { Role } from '../types';

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email: emailInput.trim(), password: passwordInput })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Invalid credentials or login failed');
    }

    const data = await res.json();
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    localStorage.removeItem(AUTH_KEY);
  },

  async checkServerSession(): Promise<UserSession | null> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        localStorage.removeItem(AUTH_KEY);
        return null;
      }
      const data = await res.json();
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
      return this.getCurrentSession();
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
