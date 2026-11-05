import { useState, useEffect } from 'react';
import { authService, UserSession } from '../services/authService';
import { Role } from '../types';

export function useAuth() {
  const [session, setSession] = useState<UserSession | null>(authService.getCurrentSession());

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(authService.getCurrentSession());
    };
    window.addEventListener('campus_pulse_auth_change', handleAuthChange);
    return () => {
      window.removeEventListener('campus_pulse_auth_change', handleAuthChange);
    };
  }, []);

  const login = (email: string, role: Role) => {
    return authService.login(email, role);
  };

  const logout = () => {
    authService.logout();
  };

  return {
    session,
    isAuthenticated: !!session,
    role: session?.role || 'public',
    login,
    logout
  };
}

