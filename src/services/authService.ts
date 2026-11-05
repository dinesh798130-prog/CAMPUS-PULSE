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
}

const AUTH_KEY = 'campus_pulse_session_v1';

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
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as UserSession;
    } catch {
      return null;
    }
  },

  login(email: string, role: Role): UserSession {
    let session: UserSession;

    if (role === 'admin') {
      session = {
        id: 'admin-1',
        role: 'admin',
        name: DEMO_CREDENTIALS.admin.name,
        email: email || DEMO_CREDENTIALS.admin.email,
        identifier: DEMO_CREDENTIALS.admin.identifier
      };
    } else if (role === 'faculty') {
      session = {
        id: 'fac-1',
        role: 'faculty',
        name: DEMO_CREDENTIALS.faculty.name,
        email: email || DEMO_CREDENTIALS.faculty.email,
        identifier: DEMO_CREDENTIALS.faculty.identifier,
        departmentId: DEMO_CREDENTIALS.faculty.departmentId
      };
    } else {
      session = {
        id: 'stud-1',
        role: 'student',
        name: DEMO_CREDENTIALS.student.name,
        email: email || DEMO_CREDENTIALS.student.email,
        identifier: DEMO_CREDENTIALS.student.identifier,
        departmentId: DEMO_CREDENTIALS.student.departmentId,
        sectionId: DEMO_CREDENTIALS.student.sectionId
      };
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('campus_pulse_auth_change'));
    return session;
  },

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event('campus_pulse_auth_change'));
  },

  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }
};

