import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { ShieldCheck, UserCheck, GraduationCap, ArrowRight, ArrowLeft } from 'lucide-react';

export const RoleSelectLoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#142B4A] via-[#10233D] to-[#0A1628] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Top Logo & University Welcome */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="lg" lightMode={true} showSubtitle={false} linkToHome={true} />
          </div>

          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 border border-white/10">
            Intelligent Timetable and Resource Scheduling System
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to Vignan Campus Pulse
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-300">
            Your intelligent gateway to academic schedules, campus resources, and real-time availability. Please select your institutional access portal:
          </p>
        </div>

        {/* 3 Role Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Administrator Card */}
          <Link
            to="/login/admin"
            className="group bg-white/10 hover:bg-white/15 border border-white/15 hover:border-blue-400/60 rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between shadow-xl backdrop-blur-md"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                  Institutional Suite
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Administrator
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Timetable creation, conflict verification, academic year & semester configuration, and room allocations.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-300 group-hover:text-white">
              <span>Admin Portal Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Faculty Card */}
          <Link
            to="/login/faculty"
            className="group bg-white/10 hover:bg-white/15 border border-white/15 hover:border-teal-400/60 rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between shadow-xl backdrop-blur-md"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                  Academic Faculty
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Faculty Member
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Personal class schedule, classroom assignments, student attendance links, and schedule update notices.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs font-bold text-teal-300 group-hover:text-white">
              <span>Faculty Portal Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Student Card */}
          <Link
            to="/login/student"
            className="group bg-white/10 hover:bg-white/15 border border-white/15 hover:border-purple-400/60 rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between shadow-xl backdrop-blur-md"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">
                  Student Portal
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Enrolled Student
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Personal section timetable, daily schedules, free periods, room locations, and timetable modification alerts.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs font-bold text-purple-300 group-hover:text-white">
              <span>Student Portal Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Campus Pulse Public Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

