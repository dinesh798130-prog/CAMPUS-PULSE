import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  DoorOpen,
  FlaskConical,
  Users,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { timetableService } from '../services/timetableService';
import {
  Building,
  Floor,
  Department,
  ResourceAvailabilityItem,
  DayOfWeek
} from '../types';
import { DAYS_OF_WEEK } from '../utils/timeUtils';

export const AvailabilityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Search & Filter state
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [resourceType, setResourceType] = useState<'all' | 'classrooms' | 'laboratories' | 'faculty'>(
    (searchParams.get('resourceType') as any) || 'all'
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Calculated availability items
  const [results, setResults] = useState<ResourceAvailabilityItem[]>([]);

  useEffect(() => {
    setBuildings(storageService.getBuildings());
    setFloors(storageService.getFloors());
    setDepartments(storageService.getDepartments());

    const initialSearch = searchParams.get('search');
    if (initialSearch) setSearchQuery(initialSearch);

    const initialType = searchParams.get('resourceType');
    if (initialType) setResourceType(initialType as any);
  }, [searchParams]);

  // Recalculate whenever filters change
  useEffect(() => {
    const list = timetableService.calculateAvailability({
      day: selectedDay,
      startTime,
      endTime,
      resourceType,
      buildingId: selectedBuildingId || undefined,
      floorId: selectedFloorId || undefined,
      departmentId: selectedDepartmentId || undefined
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setResults(list.filter(item => item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)));
    } else {
      setResults(list);
    }
  }, [selectedDay, startTime, endTime, resourceType, selectedBuildingId, selectedFloorId, selectedDepartmentId, searchQuery]);

  const filteredFloors = selectedBuildingId
    ? floors.filter(f => f.buildingId === selectedBuildingId)
    : floors;

  const availableCount = results.filter(r => r.status === 'available').length;
  const occupiedCount = results.filter(r => r.status === 'occupied').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title Banner */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-teal-600 uppercase tracking-widest">
          <Activity className="w-4 h-4" />
          <span>Hackathon Core Engine • Smart Availability Platform</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#142B4A] mt-1">
          Smart Campus Resource Availability
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Instantly query occupied and vacant classrooms, computer laboratories, and faculty members based on academic timetables for any chosen day and time interval.
        </p>
      </div>

      {/* FILTER CONTROLS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Resource Type Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[
              { id: 'all', label: 'All Resources', icon: Layers },
              { id: 'classrooms', label: 'Classrooms', icon: DoorOpen },
              { id: 'laboratories', label: 'Laboratories', icon: FlaskConical },
              { id: 'faculty', label: 'Faculty Members', icon: Users },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setResourceType(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resourceType === tab.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by name or code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Time Interval & Location Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Day */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Day of Week
            </label>
            <select
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value as DayOfWeek)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Start Time (24h)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              End Time (24h)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Building */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Building Filter
            </label>
            <select
              value={selectedBuildingId}
              onChange={e => {
                setSelectedBuildingId(e.target.value);
                setSelectedFloorId('');
              }}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Campus Buildings</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.originalCode})</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={e => setSelectedDepartmentId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Academic Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Available: <strong className="text-emerald-700">{availableCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Occupied: <strong className="text-red-700">{occupiedCount}</strong></span>
          </div>
          <div className="text-slate-400">
            Total Evaluated Resources: <strong>{results.length}</strong>
          </div>
        </div>
      </div>

      {/* RESULTS GRID / ROSTER */}
      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h4 className="text-base font-bold text-slate-700">No resources matched your filter criteria</h4>
            <p className="text-xs text-slate-400 mt-1">Try widening your building or department selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map(item => {
              const isOccupied = item.status === 'occupied';

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition-all ${
                    isOccupied
                      ? 'border-red-200 hover:border-red-300 hover:shadow-md'
                      : 'border-emerald-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Code & Live Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{item.name}</h4>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isOccupied
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isOccupied ? 'Occupied' : 'Available'}
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="text-xs text-slate-500 space-y-0.5">
                      {item.buildingName && (
                        <p className="font-medium text-slate-700">
                          {item.buildingName} {item.floorName ? `• ${item.floorName}` : ''}
                        </p>
                      )}
                      <p>{item.departmentName}</p>
                    </div>

                    {/* Ongoing Activity Card if Occupied */}
                    {isOccupied && item.currentActivity ? (
                      <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                          Ongoing Class Session
                        </span>
                        <p className="font-bold text-slate-800">{item.currentActivity.subjectName}</p>
                        <p className="text-slate-600 text-[11px]">
                          {item.currentActivity.facultyName && `Faculty: ${item.currentActivity.facultyName} • `}
                          {item.currentActivity.sectionName && `Sec: ${item.currentActivity.sectionName}`}
                        </p>
                        <p className="text-slate-500 font-mono text-[10px]">
                          {item.currentActivity.startTime} - {item.currentActivity.endTime}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-900 font-medium">
                          No overlapping class during {startTime} - {endTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Next Available */}
                  <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Available:</span>
                    <span className="font-bold text-emerald-700 font-mono">{item.nextAvailableTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

