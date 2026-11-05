import React from 'react';
import { Logo } from '../components/common/Logo';
import { ShieldCheck, Award, Building2, CheckCircle2, Cpu, Database, Zap } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Logo size="lg" showSubtitle={false} linkToHome={false} />
        </div>
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200">
          Hackathon Platform Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#142B4A]">
          About Campus Pulse
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-slate-600 leading-relaxed">
          Developed for Vignan's Foundation for Science, Technology and Research (Deemed to be University) in response to the national hackathon problem statement on smart university resource availability.
        </p>
      </div>

      {/* Core Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Deterministic Availability</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Eliminates arbitrary room guessing by calculating exact room, lab, and faculty vacancy directly from published academic timetable intervals.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Interactive 2D Spatial Blueprints</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Floor-by-floor top-down architectural layout connecting every room block to live ongoing and upcoming lectures with visual status feedback.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Conflict Collision Detection</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automated scheduling validator that prevents double-booking of rooms, faculties, and overlapping section time intervals.
          </p>
        </div>
      </div>

      {/* University Accreditation & Profile */}
      <div className="bg-[#142B4A] text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-xl">
        <div className="space-y-2">
          <span className="text-xs font-bold text-teal-300 uppercase tracking-widest">
            Institutional Identity
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Vignan's Foundation for Science, Technology and Research
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            VFSTR is a deemed-to-be university located in Vadlamudi, Guntur, Andhra Pradesh. Recognized for excellence in engineering, scientific research, and professional training with NAAC 'A+' accreditation.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold">Campus Location:</span>
            <span className="font-bold text-white">Vadlamudi, Guntur - 522213</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Accreditation:</span>
            <span className="font-bold text-yellow-300">NAAC 'A+' Grade</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">NIRF Ranking:</span>
            <span className="font-bold text-teal-300">Top 100 University Band</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Status:</span>
            <span className="font-bold text-blue-300">Deemed to be University</span>
          </div>
        </div>
      </div>
    </div>
  );
};

