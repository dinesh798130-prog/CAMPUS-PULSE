import React, { useState, useEffect } from 'react';
import {
  TimetableEntry,
  ConflictValidationResult,
  DayOfWeek
} from '../../types';
import { storageService } from '../../services/storageService';
import { validateTimetableConflict } from '../../utils/conflictValidator';
import { DAYS_OF_WEEK } from '../../utils/timeUtils';
import { AlertTriangle, CheckCircle, Save, X, Sparkles } from 'lucide-react';

interface TimetableEntryFormProps {
  initialData?: Partial<TimetableEntry>;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: TimetableEntry) => void;
}

export const TimetableEntryForm: React.FC<TimetableEntryFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSaved
}) => {
  const [academicYears, setAcademicYears] = useState(storageService.getAcademicYears());
  const [semesters, setSemesters] = useState(storageService.getSemesters());
  const [departments, setDepartments] = useState(storageService.getDepartments());
  const [sections, setSections] = useState(storageService.getSections());
  const [subjects, setSubjects] = useState(storageService.getSubjects());
  const [facultyList, setFacultyList] = useState(storageService.getFaculty());
  const [buildings, setBuildings] = useState(storageService.getBuildings());
  const [floors, setFloors] = useState(storageService.getFloors());
  const [rooms, setRooms] = useState(storageService.getRooms());

  // Form State
  const [academicYearId, setAcademicYearId] = useState(initialData?.academicYearId || academicYears[0]?.id || '');
  const [semesterId, setSemesterId] = useState(initialData?.semesterId || semesters[0]?.id || '');
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId || departments[0]?.id || '');
  const [yearOfStudy, setYearOfStudy] = useState(initialData?.yearOfStudy || 3);
  const [sectionId, setSectionId] = useState(initialData?.sectionId || sections[0]?.id || '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId || subjects[0]?.id || '');
  const [facultyId, setFacultyId] = useState(initialData?.facultyId || facultyList[0]?.id || '');
  const [buildingId, setBuildingId] = useState(initialData?.buildingId || buildings[0]?.id || '');
  const [floorId, setFloorId] = useState(initialData?.floorId || floors[0]?.id || '');
  const [roomId, setRoomId] = useState(initialData?.roomId || rooms[0]?.id || '');
  const [day, setDay] = useState<DayOfWeek>(initialData?.day || 'Monday');
  const [startTime, setStartTime] = useState(initialData?.startTime || '08:30');
  const [endTime, setEndTime] = useState(initialData?.endTime || '09:20');
  const [isLab, setIsLab] = useState(initialData?.isLab || false);
  const [status, setStatus] = useState<'published' | 'draft' | 'cancelled'>(initialData?.status || 'published');

  const [validation, setValidation] = useState<ConflictValidationResult>({ hasConflict: false, errors: [] });

  // Update floors when building changes
  const filteredFloors = floors.filter(f => f.buildingId === buildingId);
  const filteredRooms = rooms.filter(r => r.floorId === floorId && r.isSchedulable);
  const filteredSubjects = subjects.filter(s => s.departmentId === departmentId);
  const filteredSections = sections.filter(s => s.departmentId === departmentId);
  const filteredFaculty = facultyList.filter(f => f.departmentId === departmentId);

  // Auto-validate whenever scheduling parameters change
  useEffect(() => {
    if (!roomId || !facultyId || !sectionId) return;

    const candidate = {
      id: initialData?.id,
      academicYearId,
      semesterId,
      departmentId,
      yearOfStudy,
      sectionId,
      subjectId,
      facultyId,
      buildingId,
      floorId,
      roomId,
      day,
      startTime,
      endTime,
      isLab,
      status
    };

    const existing = storageService.getTimetables();
    const result = validateTimetableConflict(candidate, existing);
    setValidation(result);
  }, [roomId, facultyId, sectionId, day, startTime, endTime, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validation.hasConflict) {
      alert('Cannot save entry: There are scheduling conflicts that must be resolved first.');
      return;
    }

    const newEntry: TimetableEntry = {
      id: initialData?.id || `tt-${Date.now()}`,
      academicYearId,
      semesterId,
      departmentId,
      yearOfStudy: Number(yearOfStudy),
      sectionId,
      subjectId,
      facultyId,
      buildingId,
      floorId,
      roomId,
      day,
      startTime,
      endTime,
      isLab,
      status
    };

    if (initialData?.id) {
      storageService.updateTimetableEntry(newEntry);
    } else {
      storageService.addTimetableEntry(newEntry);
    }

    onSaved(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#142B4A] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {initialData?.id ? 'Edit Timetable Schedule Entry' : 'Create New Academic Timetable Entry'}
            </h3>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Live automated collision detection checks for room, faculty, and section double-bookings.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Conflict Alert Banner */}
          {validation.hasConflict && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2 animate-shake">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Scheduling Conflict Detected</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {validation.errors.map((err, idx) => (
                  <li key={idx} className="font-medium">
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Academic Scope Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Year</label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>{ay.yearName} {ay.isActive ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Semester</label>
              <select
                value={semesterId}
                onChange={e => setSemesterId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {semesters.map(sem => (
                  <option key={sem.id} value={sem.id}>{sem.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year of Study</label>
              <select
                value={yearOfStudy}
                onChange={e => setYearOfStudy(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value={1}>1st Year (Freshman)</option>
                <option value={2}>2nd Year (Sophomore)</option>
                <option value={3}>3rd Year (Junior)</option>
                <option value={4}>4th Year (Senior)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section</label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {filteredSections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name} ({sec.totalStudents} students)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {filteredSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Faculty Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Faculty Member</label>
            <select
              value={facultyId}
              onChange={e => setFacultyId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {filteredFaculty.map(fac => (
                <option key={fac.id} value={fac.id}>{fac.name} ({fac.designation} - {fac.facultyId})</option>
              ))}
            </select>
          </div>

          {/* Location: Building, Floor, Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Campus Building</label>
              <select
                value={buildingId}
                onChange={e => {
                  setBuildingId(e.target.value);
                  const flrs = floors.filter(f => f.buildingId === e.target.value);
                  if (flrs.length > 0) setFloorId(flrs[0].id);
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.originalCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Floor</label>
              <select
                value={floorId}
                onChange={e => {
                  setFloorId(e.target.value);
                  const rms = rooms.filter(r => r.floorId === e.target.value && r.isSchedulable);
                  if (rms.length > 0) setRoomId(rms[0].id);
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {filteredFloors.map(flr => (
                  <option key={flr.id} value={flr.id}>{flr.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Classroom / Lab</label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              >
                {filteredRooms.length === 0 ? (
                  <option value="">No schedulable rooms on floor</option>
                ) : (
                  filteredRooms.map(r => (
                    <option key={r.id} value={r.id}>{r.roomNumber} - {r.name} ({r.capacity} seats)</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Time & Day */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
              <select
                value={day}
                onChange={e => setDay(e.target.value as DayOfWeek)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Start Time (24h)</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">End Time (24h)</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="published">Published</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isLab}
                onChange={e => setIsLab(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Is Practical Laboratory Session</span>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {validation.hasConflict ? (
                <span className="text-red-600 font-bold">Resolve conflicts to enable save</span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Conflict Check Passed
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={validation.hasConflict}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  validation.hasConflict
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-[#2563EB] hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{initialData?.id ? 'Update Schedule' : 'Save Timetable Entry'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
