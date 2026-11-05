import React, { useState } from 'react';
import { Database, RotateCcw, Check, Sparkles } from 'lucide-react';
import { storageService } from '../../services/storageService';

export const DemoDataBadge: React.FC = () => {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    if (confirm('Reset all demonstration records (timetables, rooms, faculty, notifications) back to original state?')) {
      setResetting(true);
      storageService.resetAllToDemo();
      setTimeout(() => {
        setResetting(false);
        setResetDone(true);
        setTimeout(() => setResetDone(false), 3000);
      }, 500);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 max-w-5xl overflow-hidden">
        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded text-[10px] tracking-wide shrink-0 uppercase">
          <Database className="w-3 h-3 text-amber-900" /> Demo Mode
        </span>
        <span className="truncate text-slate-700">
          Showing structured demonstration data for VFSTR hackathon showcase. All timetable queries, rooms, and availability calculate live from local demo state.
        </span>
      </div>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200/80 active:bg-amber-300 rounded border border-amber-300/80 transition-colors shrink-0"
        title="Reset all timetable and resource demo data"
      >
        {resetDone ? (
          <>
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Reset Successful</span>
          </>
        ) : (
          <>
            <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </>
        )}
      </button>
    </div>
  );
};

