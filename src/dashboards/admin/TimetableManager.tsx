import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  Eye,
  Search,
  Filter,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { storageService } from '../../services/storageService';
import { TimetableEntry, DayOfWeek } from '../../types';
import { TimetableEntryForm } from '../../components/timetable/TimetableEntryForm';
import { WeeklyTimetableGrid } from '../../components/timetable/WeeklyTimetableGrid';
import { DAYS_OF_WEEK } from '../../utils/timeUtils';

export const TimetableManager: React.FC = () => {
  const [timetables, setTimetables] = useState<TimetableEntry[]>(storageService.getTimetables());
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-cse-3a');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | undefined>(undefined);

  const sections = storageService.getSections();
  const departments = storageService.getDepartments();
  const subjects = storageService.getSubjects();
  const faculty = storageService.getFaculty();
  const rooms = storageService.getRooms();
  const buildings = storageService.getBuildings();

  const getSubj = (id: string) => subjects.find(s => s.id === id);
  const getFac = (id: string) => faculty.find(f => f.id === id);
  const getRoom = (id: string) => rooms.find(r => r.id === id);
  const getBldg = (id: string) => buildings.find(b => b.id === id);
  const getSec = (id: string) => sections.find(s => s.id === id);

  const reloadData = () => {
    setTimetables(storageService.getTimetables());
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this timetable entry? Connected room and faculty schedules will update immediately.')) {
      storageService.deleteTimetableEntry(id);
      reloadData();
    }
  };

  const handleDuplicate = (entry: TimetableEntry) => {
    const duplicated: TimetableEntry = {
      ...entry,
      id: `tt-${Date.now()}`,
      day: entry.day === 'Monday' ? 'Tuesday' : 'Wednesday'
    };
    storageService.addTimetableEntry(duplicated);
    reloadData();
  };

  const handleTogglePublish = (entry: TimetableEntry) => {
    const updated: TimetableEntry = {
      ...entry,
      status: entry.status === 'published' ? 'draft' : 'published'
    };
    storageService.updateTimetableEntry(updated);
    reloadData();
  };

  const filteredTimetables = timetables.filter(t => t.sectionId === selectedSectionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#142B4A]">Timetable Scheduling Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, duplicate, validate collisions, and publish official departmental lecture and laboratory schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingEntry(undefined);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Timetable Entry</span>
          </button>
        </div>
      </div>

      {/* Filter & View Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600">Select Section:</label>
          <select
            value={selectedSectionId}
            onChange={e => setSelectedSectionId(e.target.value)}
            className="p-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.totalStudents} students)</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              List Entries ({filteredTimetables.length})
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Weekly Grid View
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <WeeklyTimetableGrid entries={filteredTimetables} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Faculty</th>
                  <th className="py-3 px-4">Room & Building</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTimetables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No schedule entries created for this section yet. Click 'Create Timetable Entry' to add one.
                    </td>
                  </tr>
                ) : (
                  filteredTimetables.map(entry => {
                    const subj = getSubj(entry.subjectId);
                    const fac = getFac(entry.facultyId);
                    const rm = getRoom(entry.roomId);
                    const bldg = getBldg(entry.buildingId);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{entry.day}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {entry.startTime} - {entry.endTime}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{subj?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{subj?.code}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{fac?.name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {rm?.roomNumber} <span className="text-slate-400 font-sans text-xs">({bldg?.originalCode})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            entry.isLab ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {entry.isLab ? 'LAB' : 'THEORY'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleTogglePublish(entry)}
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              entry.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {entry.status}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(entry)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                            title="Duplicate Entry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      <TimetableEntryForm
        initialData={editingEntry}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEntry(undefined);
        }}
        onSaved={reloadData}
      />
    </div>
  );
};

