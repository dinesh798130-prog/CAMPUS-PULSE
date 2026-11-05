import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { History, Calendar, User, ArrowRight, Info } from 'lucide-react';

export const FacultyChangesPage: React.FC = () => {
  const [changes] = useState(storageService.getChanges());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Timetable Modification Audit Logs</h1>
        <p className="text-xs text-slate-500">Record of official classroom relocations, timing changes, and class shifts.</p>
      </div>

      <div className="space-y-3">
        {changes.map(ch => (
          <div key={ch.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800">
                  {ch.changeType}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Effective: <strong>{ch.effectiveDate}</strong>
                </span>
              </div>
              <span className="text-xs text-slate-400">Updated by {ch.updatedBy}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/60">
                <span className="text-[10px] font-bold text-red-600 uppercase">Previous Schedule</span>
                <p className="font-bold text-slate-800 line-through mt-0.5">{ch.previousValue}</p>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Updated Schedule</span>
                <p className="font-bold text-emerald-900 mt-0.5">{ch.updatedValue}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 italic">
              <strong>Official Note:</strong> {ch.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

