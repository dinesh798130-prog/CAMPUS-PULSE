import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Printer,
  Compass,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../services/storageService';
import { timetableService } from '../../services/timetableService';
import { TimetableEntry, DayOfWeek } from '../../types';
import { timeToMinutes, formatTime12h, DAYS_OF_WEEK } from '../../utils/timeUtils';
import { WeeklyTimetableGrid } from '../../components/timetable/WeeklyTimetableGrid';
import { DailyTimetableList } from '../../components/timetable/DailyTimetableList';

export const StudentDashboard: React.FC = () => {
  const { session } = useAuth();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [simulatedTime, setSimulatedTime] = useState('10:00');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);

  const sectionId = session?.sectionId || 'sec-cse-3a';

  useEffect(() => {
    const entries = timetableService.getStudentSchedule(sectionId);
    setTimetableEntries(entries);
  }, [sectionId]);

  const departments = storageService.getDepartments();
  const sections = storageService.getSections();
  const subjects = storageService.getSubjects();
  const faculty = storageService.getFaculty();
  const rooms = storageService.getRooms();
  const buildings = storageService.getBuildings();

  const getSubj = (id: string) => subjects.find(s => s.id === id);
  const getFac = (id: string) => faculty.find(f => f.id === id);
  const getRoom = (id: string) => rooms.find(r => r.id === id);
  const getBldg = (id: string) => buildings.find(b => b.id === id);

  const studentDept = departments.find(d => d.id === session?.departmentId);
  const currentMin = timeToMinutes(simulatedTime);

  // Identify today's classes
  const todayClasses = timetableEntries
    .filter(e => e.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Current class
  const currentClass = todayClasses.find(
    e => currentMin >= timeToMinutes(e.startTime) && currentMin < timeToMinutes(e.endTime)
  );

  // Next class
  const nextClass = todayClasses.find(e => timeToMinutes(e.startTime) > currentMin);

  return (
    <div className="space-y-8">
      {/* Student Welcome Card */}
      <div className="bg-gradient-to-r from-[#142B4A] via-[#1A3860] to-[#142B4A] text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Section {session?.sectionId ? 'CSE-3A' : 'CSE-3A'} • Academic Year 2026-2027</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {session?.name || 'Rahul Sharma'}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
              Registration No: <strong className="font-mono text-white">{session?.identifier || '211FA04001'}</strong> • Dept: <strong>{studentDept?.name || 'Computer Science & Engineering'}</strong> • Semester VI (Even)
            </p>
          </div>

          {/* Time simulation pill */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 flex flex-col gap-2 shrink-0">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">
              Simulated Academic Time
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value as DayOfWeek)}
                className="bg-slate-900/80 text-white border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <input
                type="time"
                value={simulatedTime}
                onChange={e => setSimulatedTime(e.target.value)}
                className="bg-slate-900/80 text-white border border-white/20 rounded-lg px-2 py-1 text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATUS HERO TILES: CURRENT & NEXT CLASS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ongoing Class Tile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Current Class Status
              </span>
              {currentClass ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 animate-pulse">
                  Ongoing Now
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700">
                  Free Period
                </span>
              )}
            </div>

            {currentClass ? (
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {getSubj(currentClass.subjectId)?.code}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {getSubj(currentClass.subjectId)?.name}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{getFac(currentClass.facultyId)?.name}</span>
                </p>
                <p className="text-xs font-mono font-bold text-blue-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Room {getRoom(currentClass.roomId)?.roomNumber} ({getBldg(currentClass.buildingId)?.originalCode})</span>
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-800">No Ongoing Lecture</p>
                <p className="text-xs text-slate-500 mt-0.5">You have a free period or study break at {simulatedTime}.</p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400 font-mono">
            {currentClass ? `Slot: ${currentClass.startTime} - ${currentClass.endTime}` : 'Available for library study'}
          </div>
        </div>

        {/* Next Class Tile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Next Upcoming Class Today
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700">
                Next Session
              </span>
            </div>

            {nextClass ? (
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {getSubj(nextClass.subjectId)?.code}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {getSubj(nextClass.subjectId)?.name}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{getFac(nextClass.facultyId)?.name}</span>
                </p>
                <p className="text-xs font-mono font-bold text-blue-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Room {getRoom(nextClass.roomId)?.roomNumber} ({getBldg(nextClass.buildingId)?.originalCode})</span>
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-blue-400 mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-800">All Scheduled Classes Done</p>
                <p className="text-xs text-slate-500 mt-0.5">No further lecture slots remain for {selectedDay}.</p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400 font-mono">
            {nextClass ? `Starts at ${nextClass.startTime}` : 'Completed day schedule'}
          </div>
        </div>

        {/* Quick Links & Shortcuts Tile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Campus Pulse Shortcuts
            </span>
            <div className="space-y-2.5">
              <Link
                to="/campus"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Interactive Blueprint Explorer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/availability"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-xs font-semibold text-slate-700 hover:text-teal-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Find Available Free Classrooms</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/student/timetable"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-xs font-semibold text-slate-700 hover:text-purple-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Full Weekly Section Timetable</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Published by Academic Cell</span>
            <span className="text-emerald-700 font-bold">Sync Active</span>
          </div>
        </div>
      </div>

      {/* TIMETABLE VIEW CONTROLS & DISPLAY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#142B4A]">
              My Academic Schedule • Section CSE-3A
            </h2>
            <p className="text-xs text-slate-500">
              Showing active schedule for {selectedDay}. Switch to Weekly view to inspect full calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Schedule
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly Grid
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Print Timetable"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'daily' ? (
          <DailyTimetableList
            entries={timetableEntries}
            day={selectedDay}
            currentTime={simulatedTime}
          />
        ) : (
          <WeeklyTimetableGrid
            entries={timetableEntries}
            currentDay={selectedDay}
            currentTime={simulatedTime}
          />
        )}
      </div>
    </div>
  );
};

