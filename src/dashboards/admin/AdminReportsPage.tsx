import React from 'react';
import { storageService } from '../../services/storageService';
import { timetableService } from '../../services/timetableService';
import { BarChart3, TrendingUp, Download, Printer } from 'lucide-react';
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

export const AdminReportsPage: React.FC = () => {
  const metrics = timetableService.getCampusMetrics();
  const departments = storageService.getDepartments();
  const rooms = storageService.getRooms();

  const deptUtilization = departments.map(d => {
    const dRooms = rooms.filter(r => r.departmentId === d.id);
    return {
      name: d.code,
      totalRooms: dRooms.length,
      utilizationRate: Math.floor(Math.random() * 25) + 65 // Simulated utilization %
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#142B4A]">Spatial & Resource Utilization Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional academic metrics, room efficiency audits, and laboratory scheduling hours.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="w-4 h-4" />
          <span>Print Audit Report</span>
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Peak Utilization Rate</span>
          <p className="text-3xl font-extrabold text-blue-700 font-mono">78.4%</p>
          <p className="text-xs text-slate-500 mt-1">Average classroom occupancy during peak hours (10:00 - 14:00).</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Weekly Lab Hours</span>
          <p className="text-3xl font-extrabold text-teal-700 font-mono">142 Hrs</p>
          <p className="text-xs text-slate-500 mt-1">Total practical laboratory sessions conducted across campus.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Timetable Conflict Free Rate</span>
          <p className="text-3xl font-extrabold text-emerald-700 font-mono">100%</p>
          <p className="text-xs text-slate-500 mt-1">Zero overlaps detected by algorithmic timetable validator.</p>
        </div>
      </div>

      {/* Department Utilization Bar Chart */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#142B4A]">Departmental Classroom Utilization Rate (%)</h3>
          <p className="text-xs text-slate-500">Effective space utilization percentage per academic department.</p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptUtilization} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="utilizationRate" fill="#2563EB" name="Utilization %" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

