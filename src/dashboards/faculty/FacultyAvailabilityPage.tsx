import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../services/storageService';
import { timetableService } from '../../services/timetableService';
import { DAYS_OF_WEEK } from '../../utils/timeUtils';
import { DayOfWeek } from '../../types';
import { Activity, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export const FacultyAvailabilityPage: React.FC = () => {
  const { session } = useAuth();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [simulatedTime, setSimulatedTime] = useState('10:00');

  const facultyId = session?.id || 'fac-1';
  const statusInfo = timetableService.getFacultyStatus(facultyId, selectedDay, simulatedTime);
  const schedule = timetableService.getFacultySchedule(facultyId, selectedDay);

  const subjects = storageService.getSubjects();
  const rooms = storageService.getRooms();
  const getSubj = (id: string) => subjects.find(s => s.id === id);
  const getRoom = (id: string) => rooms.find(r => r.id === id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">My Free Slots & Student Consultation Hours</h1>
        <p className="text-xs text-slate-500">Live availability status computed from official teaching schedule.</p>
      </div>

      {/* Simulator bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Simulate Target Time:</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value as DayOfWeek)}
            className="p-2 border border-slate-300 rounded-xl font-bold bg-slate-50"
          >
            {DAYS_OF_WEEK.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <input
            type="time"
            value={simulatedTime}
            onChange={e => setSimulatedTime(e.target.value)}
            className="p-2 border border-slate-300 rounded-xl font-mono font-bold bg-slate-50"
          />
        </div>
      </div>

      {/* Status Result Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Availability at {simulatedTime} on {selectedDay}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              {statusInfo.status === 'occupied' ? 'Teaching Scheduled Class' : 'Available for Consultations'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Office Cabin: Room A-205, Vignan Bhavan (A Block)
            </p>
          </div>

          <span
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shrink-0 ${
              statusInfo.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {statusInfo.status === 'occupied' ? 'Occupied' : 'Available'}
          </span>
        </div>

        {/* Schedule List */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Assigned Teaching Periods on {selectedDay}
          </h3>

          <div className="space-y-2">
            {schedule.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl">
                No teaching sessions scheduled on {selectedDay}. Entire day is open for research and consultation.
              </p>
            ) : (
              schedule.map(e => (
                <div
                  key={e.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {e.startTime} - {e.endTime}
                    </span>
                    <span className="font-bold text-slate-800">{getSubj(e.subjectId)?.name}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">Room {getRoom(e.roomId)?.roomNumber}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

