import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../hooks/useAuth';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

interface RoleLoginPageProps {
  role: 'admin' | 'faculty' | 'student';
}

const DEFAULT_EMAILS: Record<string, string> = {
  admin: 'admin@vignan.ac.in',
  faculty: 'faculty@vignan.ac.in',
  student: 'student@vignan.ac.in'
};

export const RoleLoginPage: React.FC<RoleLoginPageProps> = ({ role }) => {
  const [email, setEmail] = useState(DEFAULT_EMAILS[role] || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const roleMeta = {
    admin: {
      title: 'Administrator Login',
      badge: 'Academic Administration',
      icon: ShieldCheck,
      color: 'blue',
      redirect: '/admin/dashboard'
    },
    faculty: {
      title: 'Faculty Portal Login',
      badge: 'Academic Department Faculty',
      icon: UserCheck,
      color: 'teal',
      redirect: '/faculty/dashboard'
    },
    student: {
      title: 'Student Portal Login',
      badge: 'Student Academic Records',
      icon: GraduationCap,
      color: 'purple',
      redirect: '/student/dashboard'
    }
  }[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(roleMeta.redirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Top Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo size="lg" showSubtitle={false} linkToHome={true} />
          </div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200">
            {roleMeta.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142B4A]">
            {roleMeta.title}
          </h2>
          <p className="text-xs text-slate-500">
            Intelligent Timetable and Resource Scheduling System
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@vignan.ac.in"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to role selector
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
