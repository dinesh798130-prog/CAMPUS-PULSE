import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import { Role, UserSession } from '../types';

export function useAuth() {
  const [session, setSession] = useState<UserSession | null>(authService.getCurrentSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize session from Capacitor Preferences
    tokenStorage.getSession().then((stored) => {
      setSession(stored || authService.getCurrentSession());
      setLoading(false);
    });

    const handleAuthChange = async () => {
      const current = await tokenStorage.getSession();
      setSession(current || authService.getCurrentSession());
    };

    const handleSessionExpired = () => {
      setSession(null);
    };

    window.addEventListener('campus_pulse_auth_change', handleAuthChange);
    window.addEventListener('campus_pulse_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('campus_pulse_auth_change', handleAuthChange);
      window.removeEventListener('campus_pulse_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, role: Role, password?: string): Promise<UserSession> => {
    const userSession = await authService.login(email, role, password);
    setSession(userSession);
    return userSession;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setSession(null);
  };

  return {
    session,
    isAuthenticated: !!session,
    role: session?.role || 'public',
    loading,
    login,
    logout
  };
}
