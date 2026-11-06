import { Role, UserSession } from '../types';
import { apiService } from './apiService';

const SESSION_KEY = 'cp_user_session';

export const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@vignan.ac.in',
    password: 'admin123',
    role: 'admin' as Role,
    name: 'Dr. Ch. Srinivas',
    identifier: 'VFSTR-ADMIN-01',
    departmentId: 'All'
  },
  faculty: {
    email: 'k_radhakrishna@vignan.ac.in',
    password: 'faculty123',
    role: 'faculty' as Role,
    name: 'Dr. K. Radhakrishna',
    identifier: 'VFSTR-FAC-101',
    departmentId: 'dept-cse'
  },
  student: {
    email: 'rahul.211fa04001@vignan.ac.in',
    password: 'student123',
    role: 'student' as Role,
    name: 'Rahul Sharma',
    identifier: '211FA04001',
    departmentId: 'dept-cse',
    sectionId: 'sec-cse-3a'
  }
};

export const authService = {
  getCurrentSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as UserSession;
    } catch {
      return null;
    }
  },

  async login(email: string, role: Role, password?: string): Promise<UserSession> {
    // Authenticate directly with the production backend
    return await apiService.login({ email, password, role });
  },

  async logout(): Promise<void> {
    await apiService.logout();
  },

  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }
};
