import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Layers,
  DoorOpen,
  FlaskConical,
  Users,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { storageService } from '../../services/storageService';
import { timetableService } from '../../services/timetableService';
import { TimetableEntryForm } from '../../components/timetable/TimetableEntryForm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(timetableService.getCampusMetrics());
  const [showAddModal, setShowAddModal] = useState(false);
  const [recentTimetables, setRecentTimetables] = useState(storageService.getTimetables().slice(0, 5));

  useEffect(() => {
    const update = () => {
      setMetrics(timetableService.getCampusMetrics());
      setRecentTimetables(storageService.getTimetables().slice(0, 5));
    };
    update();
    window.addEventListener('campus_pulse_storage_change', update);
    return () => window.removeEventListener('campus_pulse_storage_change', update);
  }, []);

  const departments = storageService.getDepartments();
  const rooms = storageService.getRooms();

  // Prepare chart data
  const deptData = departments.map(d => {
    const dRooms = rooms.filter(r => r.departmentId === d.id);
    return {
      name: d.code,
      classrooms: dRooms.filter(r => r.type === 'classroom').length,
      labs: dRooms.filter(r => r.type === 'laboratory').length
    };
  });

  const occupancyData = [
    { name: 'Occupied', value: metrics.occupiedRoomsCount, color: '#DC2626' },
    { name: 'Available', value: metrics.availableRoomsCount, color: '#16A34A' }
  ];

  return (
    <div className="space-y-8">
      {/* Admin Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Academic Affairs & Spatial Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] mt-1">
            Administrator Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time management of academic timetables, buildings, 2D floor blueprints, and university resources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Timetable Entry</span>
          </button>
        </div>
      </div>

      {/* 8 DYNAMIC METRIC TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Buildings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Campus Blocks</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] font-mono">{metrics.totalBuildings}</p>
          <Link to="/admin/buildings" className="text-[11px] font-semibold text-blue-600 hover:underline mt-1 block">
            Manage Buildings &rarr;
          </Link>
        </div>

        {/* Total Floors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Floors Configured</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] font-mono">{metrics.totalFloors}</p>
          <Link to="/admin/floors" className="text-[11px] font-semibold text-indigo-600 hover:underline mt-1 block">
            Configure Blueprints &rarr;
          </Link>
        </div>

        {/* Total Classrooms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Classrooms</span>
            <DoorOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] font-mono">{metrics.totalClassrooms}</p>
          <Link to="/admin/classrooms" className="text-[11px] font-semibold text-emerald-600 hover:underline mt-1 block">
            Classroom Roster &rarr;
          </Link>
        </div>

        {/* Total Laboratories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Laboratories</span>
            <FlaskConical className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-mono">{metrics.totalLabs}</p>
          <Link to="/admin/laboratories" className="text-[11px] font-semibold text-teal-600 hover:underline mt-1 block">
            Lab Inventory &rarr;
          </Link>
        </div>

        {/* Total Faculty */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Teaching Faculty</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] font-mono">{metrics.totalFaculty}</p>
          <Link to="/admin/faculty" className="text-[11px] font-semibold text-purple-600 hover:underline mt-1 block">
            Faculty Directory &rarr;
          </Link>
        </div>

        {/* Occupied Rooms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rooms Occupied</span>
            <Activity className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono">{metrics.occupiedRoomsCount}</p>
          <span className="text-[11px] text-slate-400">Live timetable match</span>
        </div>

        {/* Available Rooms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rooms Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">{metrics.availableRoomsCount}</p>
          <span className="text-[11px] text-emerald-700 font-bold">Ready for allocation</span>
        </div>

        {/* Scheduled Classes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Published Classes</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] font-mono">{metrics.totalScheduledClasses}</p>
          <Link to="/admin/timetable" className="text-[11px] font-semibold text-blue-600 hover:underline mt-1 block">
            Timetable Manager &rarr;
          </Link>
        </div>
      </div>

      {/* CHARTS ROW (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Resource Allocation Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#142B4A]">Department Classrooms & Laboratory Distribution</h3>
              <p className="text-xs text-slate-500">Resource capacity breakdown across participating university departments.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="classrooms" fill="#2563EB" name="Classrooms" radius={[4, 4, 0, 0]} />
                <Bar dataKey="labs" fill="#0D9488" name="Laboratories" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Occupancy Ratio Donut Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#142B4A]">Live Campus Space Utilization</h3>
            <p className="text-xs text-slate-500">Real-time ratio of occupied to vacant lecture spaces.</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-around border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-red-600">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <span>Occupied ({metrics.occupiedRoomsCount})</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span>Available ({metrics.availableRoomsCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/admin/timetable"
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-sm transition-all group"
        >
          <Calendar className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 text-sm">Timetable Scheduling</h4>
          <p className="text-xs text-slate-500 mt-1">Create, edit, duplicate, and publish weekly grids with collision validation.</p>
        </Link>

        <Link
          to="/admin/classrooms"
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-sm transition-all group"
        >
          <DoorOpen className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 text-sm">Classroom Registry</h4>
          <p className="text-xs text-slate-500 mt-1">Add new rooms to buildings and floors; updates blueprints automatically.</p>
        </Link>

        <Link
          to="/admin/academic-years"
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all group"
        >
          <Layers className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 text-sm">Academic Calendars</h4>
          <p className="text-xs text-slate-500 mt-1">Manage academic years and semesters without overwriting past history.</p>
        </Link>

        <Link
          to="/admin/reports"
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all group"
        >
          <TrendingUp className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-slate-900 text-sm">Resource Utilization</h4>
          <p className="text-xs text-slate-500 mt-1">Export classroom utilization metrics, lab hours, and faculty workloads.</p>
        </Link>
      </div>

      {/* CREATE ENTRY MODAL */}
      <TimetableEntryForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => {
          setMetrics(timetableService.getCampusMetrics());
        }}
      />
    </div>
  );
};

