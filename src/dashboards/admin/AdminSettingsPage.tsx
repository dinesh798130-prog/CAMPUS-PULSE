import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { Settings, RotateCcw, Download, Database, Check, ShieldCheck } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    if (confirm('Are you sure you want to restore all timetable entries, rooms, and demonstration data to their default state?')) {
      storageService.resetAllToDemo();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const handleExport = () => {
    const data = {
      buildings: storageService.getBuildings(),
      floors: storageService.getFloors(),
      rooms: storageService.getRooms(),
      departments: storageService.getDepartments(),
      timetables: storageService.getTimetables(),
      faculty: storageService.getFaculty(),
      students: storageService.getStudents(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vignan_Campus_Pulse_State_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Platform Settings & Demonstration Controls</h1>
        <p className="text-xs text-slate-500">Manage local storage state, demonstration dataset controls, and system backups.</p>
      </div>

      <div className="space-y-4">
        {/* Demonstration Data Reset Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base text-slate-900">Reset Demonstration Dataset</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Restores initial timetables, rooms, and faculty schedules. Ideal if testing modifications and wanting a clean state for the hackathon judges.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
          >
            {resetSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Restored Defaults!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Default Demo Data</span>
              </>
            )}
          </button>
        </div>

        {/* State Backup Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Export State (JSON)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Export the entire frontend state (all rooms, floors, blueprints, and timetable entries) as a JSON file.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Snapshot</span>
          </button>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2 text-xs text-slate-600">
          <h4 className="font-bold text-sm text-slate-900">Application Architecture Specification</h4>
          <p><strong>System Name:</strong> CAMPUS PULSE</p>
          <p><strong>Institution:</strong> Vignan's Foundation for Science, Technology and Research (Deemed to be University)</p>
          <p><strong>Tagline:</strong> One Campus. Every Schedule. Smarter Availability.</p>
          <p><strong>Frontend Stack:</strong> React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, LocalStorage Persistence.</p>
          <p><strong>Backend Readiness:</strong> Service layer abstraction enables 1-to-1 REST / GraphQL API replacement.</p>
        </div>
      </div>
    </div>
  );
};

