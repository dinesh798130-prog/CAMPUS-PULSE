import React, { useState, useEffect } from 'react';
import {
  TimetableEntry,
  ConflictValidationResult,
  DayOfWeek,
  AcademicYear,
  Semester,
  Department,
  Section,
  Subject,
  Faculty,
  Building,
  Floor,
  Room
} from '../../types';
import { apiService } from '../../services/apiService';
import { validateTimetableConflict } from '../../utils/conflictValidator';
import { DAYS_OF_WEEK } from '../../utils/timeUtils';
import { AlertTriangle, CheckCircle, Save, X, Loader2 } from 'lucide-react';

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
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [existingEntries, setExistingEntries] = useState<TimetableEntry[]>([]);

  // Form State
  const [academicYearId, setAcademicYearId] = useState(initialData?.academicYearId || '');
  const [semesterId, setSemesterId] = useState(initialData?.semesterId || '');
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId || '');
  const [yearOfStudy, setYearOfStudy] = useState(initialData?.yearOfStudy || 3);
  const [sectionId, setSectionId] = useState(initialData?.sectionId || '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId || '');
  const [facultyId, setFacultyId] = useState(initialData?.facultyId || '');
  const [buildingId, setBuildingId] = useState(initialData?.buildingId || '');
  const [floorId, setFloorId] = useState(initialData?.floorId || '');
  const [roomId, setRoomId] = useState(initialData?.roomId || '');
  const [day, setDay] = useState<DayOfWeek>(initialData?.day || 'Monday');
  const [startTime, setStartTime] = useState(initialData?.startTime || '08:30');
  const [endTime, setEndTime] = useState(initialData?.endTime || '09:20');
  const [isLab, setIsLab] = useState(initialData?.isLab || false);
  const [status, setStatus] = useState<'published' | 'draft' | 'cancelled'>(initialData?.status || 'published');

  const [validation, setValidation] = useState<ConflictValidationResult>({ hasConflict: false, errors: [] });

  // Load metadata from backend
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [ays, sems, depts, secs, subjs, facs, bldgs, flrs, rms, tts] = await Promise.all([
          apiService.getAcademicYears(),
          apiService.getSemesters(),
          apiService.getDepartments(),
          apiService.getSections(),
          apiService.getSubjects(),
          apiService.getFaculty(),
          apiService.getBuildings(),
          apiService.getFloors(),
          apiService.getRooms(),
          apiService.getTimetables().catch(() => [])
        ]);

        setAcademicYears(ays);
        setSemesters(sems);
        setDepartments(depts);
        setSections(secs);
        setSubjects(subjs);
        setFacultyList(facs);
        setBuildings(bldgs);
        setFloors(flrs);
        setRooms(rms);
        setExistingEntries(tts);

        if (!academicYearId && ays[0]) setAcademicYearId(initialData?.academicYearId || ays[0].id);
        if (!semesterId && sems[0]) setSemesterId(initialData?.semesterId || sems[0].id);
        if (!departmentId && depts[0]) setDepartmentId(initialData?.departmentId || depts[0].id);
        if (!sectionId && secs[0]) setSectionId(initialData?.sectionId || secs[0].id);
        if (!subjectId && subjs[0]) setSubjectId(initialData?.subjectId || subjs[0].id);
        if (!facultyId && facs[0]) setFacultyId(initialData?.facultyId || facs[0].id);
        if (!buildingId && bldgs[0]) setBuildingId(initialData?.buildingId || bldgs[0].id);
        if (!floorId && flrs[0]) setFloorId(initialData?.floorId || flrs[0].id);
        if (!roomId && rms[0]) setRoomId(initialData?.roomId || rms[0].id);
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to load scheduling metadata from backend API');
      } finally {
        setIsLoadingMeta(false);
      }
    }
    if (isOpen) {
      loadMeta();
    }
  }, [isOpen]);

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

    const result = validateTimetableConflict(candidate, existingEntries);
    setValidation(result);
  }, [roomId, facultyId, sectionId, day, startTime, endTime, departmentId, semesterId, academicYearId, isLab, status, existingEntries]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.hasConflict) return;

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

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let saved: TimetableEntry;
      if (initialData?.id) {
        saved = await apiService.updateTimetableEntry(newEntry);
      } else {
        saved = await apiService.addTimetableEntry(newEntry);
      }
      onSaved(saved || newEntry);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to persist timetable entry to backend API');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Backend Error Alert */}
        {submitError && (
          <div className="bg-red-50 border-b border-red-200 p-4 text-xs text-red-800 font-mono">
            <strong>Backend Error:</strong> {submitError}
          </div>
        )}

        {/* Form Body */}
        {isLoadingMeta ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading metadata from backend API...</p>
          </div>
        ) : (
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
                      <span className="font-bold uppercase tracking-wider">{err.type}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!validation.hasConflict && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Validation Clean: No double bookings detected for room, faculty, or section.</span>
              </div>
            )}

            {/* Department & Academic Level */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={e => {
                    setDepartmentId(e.target.value);
                    const subjs = subjects.filter(s => s.departmentId === e.target.value);
                    if (subjs[0]) setSubjectId(subjs[0].id);
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year of Study</label>
                <select
                  value={yearOfStudy}
                  onChange={e => setYearOfStudy(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                <select
                  value={sectionId}
                  onChange={e => setSectionId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                >
                  {filteredSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.totalStudents} students)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject & Faculty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Course</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {filteredSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Faculty Member</label>
                <select
                  value={facultyId}
                  onChange={e => setFacultyId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {filteredFaculty.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Building, Floor & Room */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Building Block</label>
                <select
                  value={buildingId}
                  onChange={e => {
                    setBuildingId(e.target.value);
                    const fl = floors.filter(f => f.buildingId === e.target.value);
                    if (fl[0]) {
                      setFloorId(fl[0].id);
                      const rm = rooms.filter(r => r.floorId === fl[0].id);
                      if (rm[0]) setRoomId(rm[0].id);
                    }
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.originalCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor Level</label>
                <select
                  value={floorId}
                  onChange={e => {
                    setFloorId(e.target.value);
                    const rm = rooms.filter(r => r.floorId === e.target.value);
                    if (rm[0]) setRoomId(rm[0].id);
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  {filteredFloors.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (L{f.floorNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Lab</label>
                <select
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                >
                  {filteredRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} - {r.name} (Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Day & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={day}
                  onChange={e => setDay(e.target.value as DayOfWeek)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Time (24h)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Time (24h)</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isLab}
                  onChange={e => setIsLab(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Practical / Laboratory Session</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Publication Status:</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="published">Published (Visible to Students)</option>
                  <option value="draft">Draft (Internal Only)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={validation.hasConflict || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{initialData?.id ? 'Update Schedule Entry' : 'Save to Backend'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
