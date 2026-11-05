import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { AcademicYear } from '../../types';
import { FileSpreadsheet, Plus, CheckCircle2, Archive, Edit, Save, X, Sparkles } from 'lucide-react';

export const AcademicYearManager: React.FC = () => {
  const [years, setYears] = useState<AcademicYear[]>(storageService.getAcademicYears());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearName, setYearName] = useState('2027-2028');
  const [startDate, setStartDate] = useState('2027-06-15');
  const [endDate, setEndDate] = useState('2028-05-30');

  const reload = () => setYears(storageService.getAcademicYears());

  const handleSetActive = (id: string) => {
    const updated = years.map(y => ({
      ...y,
      isActive: y.id === id,
      isArchived: y.id === id ? false : y.isArchived
    }));
    storageService.saveAcademicYears(updated);
    reload();
  };

  const handleToggleArchive = (id: string) => {
    const updated = years.map(y => (y.id === id ? { ...y, isArchived: !y.isArchived } : y));
    storageService.saveAcademicYears(updated);
    reload();
  };

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const newYear: AcademicYear = {
      id: `ay-${Date.now()}`,
      yearName,
      startDate,
      endDate,
      isActive: false,
      isArchived: false
    };
    storageService.saveAcademicYears([...years, newYear]);
    setIsModalOpen(false);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#142B4A]">Academic Year Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure academic sessions without ever overwriting historical schedules or past student timetables.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Academic Year</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {years.map(y => (
          <div
            key={y.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              y.isActive ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-mono font-black text-slate-900">{y.yearName}</span>
                <div className="flex items-center gap-1.5">
                  {y.isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Active Session
                    </span>
                  )}
                  {y.isArchived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>Term Start: <strong>{y.startDate}</strong></p>
                <p>Term Conclusion: <strong>{y.endDate}</strong></p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              {!y.isActive ? (
                <button
                  onClick={() => handleSetActive(y.id)}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Activate Session
                </button>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Active Current Session
                </span>
              )}

              <button
                onClick={() => handleToggleArchive(y.id)}
                className="text-slate-500 hover:text-slate-800"
              >
                {y.isArchived ? 'Unarchive' : 'Archive Session'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Academic Year</h3>
            <form onSubmit={handleAddYear} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Academic Year Name</label>
                <input
                  type="text"
                  value={yearName}
                  onChange={e => setYearName(e.target.value)}
                  required
                  placeholder="e.g. 2027-2028"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Term Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Term End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2563EB] text-white rounded-lg font-bold"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

