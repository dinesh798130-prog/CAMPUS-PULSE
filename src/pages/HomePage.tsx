import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Building2,
  Activity,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Layers,
  FlaskConical,
  GraduationCap
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { timetableService } from '../services/timetableService';
import { Building } from '../types';

export const HomePage: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [metrics, setMetrics] = useState(timetableService.getCampusMetrics());
  const [quickSearch, setQuickSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setBuildings(storageService.getBuildings());
    const interval = setInterval(() => {
      setMetrics(timetableService.getCampusMetrics());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;

    const trimmed = quickSearch.trim();
    // Check if it's a room
    const room = storageService.getRoomById(trimmed);
    if (room) {
      const bldg = storageService.getBuildingById(room.buildingId);
      if (bldg) {
        navigate(`/campus/${bldg.slug}?room=${room.id}`);
        return;
      }
    }

    // Default to availability or timetable search
    navigate(`/availability?search=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#142B4A] via-[#10233D] to-[#0A1628] text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-teal-500/10 blur-[100px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-blue-200 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Vignan's Foundation for Science, Technology and Research (Deemed to be University)</span>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Your Campus. Your Schedule.{' '}
              <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-blue-200 bg-clip-text text-transparent block sm:inline">
                Everything Connected.
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
              Explore academic timetables, discover campus resources, and check classroom, laboratory, and faculty availability through one intelligent platform.
            </p>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-2xl border-2 border-white/20 focus-within:border-blue-500 transition-all">
              <Search className="w-6 h-6 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={quickSearch}
                onChange={e => setQuickSearch(e.target.value)}
                placeholder="Search classroom (N-204, A-101), faculty, lab, or subject..."
                className="w-full px-3 py-2 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 shrink-0"
              >
                Find Now
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-400">
              <span>Quick searches:</span>
              {['N-204', 'A-101', 'U-204', 'Dr. Radhakrishna', 'Machine Learning'].map(term => (
                <button
                  type="button"
                  key={term}
                  onClick={() => setQuickSearch(term)}
                  className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-blue-200 rounded-md transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>

          {/* Quick CTA Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              to="/campus"
              className="px-6 py-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Explore Campus</span>
            </Link>

            <Link
              to="/timetable"
              className="px-6 py-3 bg-white hover:bg-slate-100 text-[#142B4A] rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Find My Timetable</span>
            </Link>

            <Link
              to="/availability"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span>Check Availability</span>
            </Link>
          </div>
        </div>

        {/* Real-Time Live Campus Metrics Strip */}
        <div className="max-w-6xl mx-auto mt-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono">{metrics.totalRooms}</p>
            <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mt-1">Campus Rooms & Labs</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">{metrics.availableRoomsCount}</p>
            <p className="text-xs text-emerald-200 uppercase tracking-wider font-semibold mt-1">Available Right Now</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">{metrics.occupiedRoomsCount}</p>
            <p className="text-xs text-red-200 uppercase tracking-wider font-semibold mt-1">Currently Occupied</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-teal-300 font-mono">{metrics.totalScheduledClasses}</p>
            <p className="text-xs text-teal-200 uppercase tracking-wider font-semibold mt-1">Active Schedulings</p>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/timetable"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Find My Timetable
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Look up published timetables without login. Filter by department, semester, and section.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 mt-4 group-hover:translate-x-1 transition-transform">
              View Schedules &rarr;
            </span>
          </Link>

          <Link
            to="/availability?resourceType=classrooms"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Classroom Availability
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Identify free lecture halls and seminar rooms across all buildings for any time slot.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-4 group-hover:translate-x-1 transition-transform">
              Check Classrooms &rarr;
            </span>
          </Link>

          <Link
            to="/availability?resourceType=laboratories"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
              Laboratory Availability
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Explore computing, AI, CAD, and electronics laboratory schedules and equipment specs.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 mt-4 group-hover:translate-x-1 transition-transform">
              Check Laboratories &rarr;
            </span>
          </Link>

          <Link
            to="/availability?resourceType=faculty"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Faculty Availability
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Locate faculty members, review teaching intervals, and find free slots for consultations.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 mt-4 group-hover:translate-x-1 transition-transform">
              Check Faculty &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* EXPLORE OUR CAMPUS SECTION (5 BUILDINGS WITH EXACT IMAGES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Architectural & Academic Hubs
            </span>
            <h2 className="text-3xl font-extrabold text-[#142B4A] mt-1">
              Explore Our Campus
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Inspect interactive floor-by-floor 2D blueprints and live room availability for all registered blocks.
            </p>
          </div>

          <Link
            to="/campus"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <span>View All Campus Blocks</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 5 Building Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {buildings.map(bldg => {
            const isNBlock = bldg.slug === 'nagarjuna-block';

            return (
              <div
                key={bldg.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Building Photograph */}
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={bldg.imageUrl}
                    alt={bldg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200">
                      {bldg.originalCode}
                    </span>
                  </div>

                  {isNBlock && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded shadow-sm">
                        Courtyard & Pillars
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-xl font-extrabold text-white leading-snug drop-shadow-sm">
                      {bldg.name}
                    </h3>
                    <p className="text-xs text-blue-200 mt-0.5">
                      {bldg.totalFloors} Registered Floors • {bldg.departments.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Building Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {bldg.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Interactive Blueprints Active
                    </span>

                    <Link
                      to={`/campus/${bldg.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#142B4A] group-hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <span>Explore Building</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HACKATHON PROBLEM STATEMENT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-teal-300 uppercase tracking-widest border border-white/15">
              Hackathon Problem Statement Resolution
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              "Smart campus availability platform that uses academic timetables to identify occupied and available classrooms, laboratories, and faculty members."
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Campus Pulse connects university academic schedules with 2D architectural blueprints, timetable conflict verification, public search without login, and role-based institutional management dashboards.
            </p>

            <div className="pt-4 flex flex-wrap gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Real-Time Collision Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Zero Mandatory Login for Students</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Synchronized Spatial Blueprints</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

