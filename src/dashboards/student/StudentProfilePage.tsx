import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../services/storageService';
import { User, Mail, GraduationCap, Building, Calendar, CheckCircle, ShieldCheck } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { session } = useAuth();
  const departments = storageService.getDepartments();
  const dept = departments.find(d => d.id === session?.departmentId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Student Academic Profile</h1>
        <p className="text-xs text-slate-500">Official student identity verified by VFSTR Academic Cell.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="w-20 h-20 rounded-2xl bg-[#142B4A] text-white text-2xl font-black flex items-center justify-center shadow-md">
            RS
          </div>
          <div className="text-center sm:text-left space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
              Active Enrolled Student
            </span>
            <h2 className="text-xl font-bold text-slate-900">{session?.name || 'Rahul Sharma'}</h2>
            <p className="text-xs font-mono text-slate-500">Reg No: {session?.identifier || '211FA04001'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
            <p className="text-sm font-bold text-slate-800 mt-1">{dept?.name || 'Computer Science & Engineering'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Current Section</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Section CSE-3A (Year 3, Sem VI)</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Institutional Email</span>
            <p className="text-sm font-mono font-bold text-slate-800 mt-1">{session?.email || 'rahul.211fa04001@vignan.ac.in'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Campus Location</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Vignan Bhavan (A Block), Vadlamudi</p>
          </div>
        </div>
      </div>
    </div>
  );
};

