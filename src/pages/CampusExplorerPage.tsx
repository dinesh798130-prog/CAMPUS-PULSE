import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowRight, Layers, DoorOpen, FlaskConical, MapPin, Compass, AlertCircle, RefreshCw } from 'lucide-react';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/apiConfig';
import { Building, Room } from '../types';

export const CampusExplorerPage: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, rList] = await Promise.all([
        apiService.getBuildings(),
        apiService.getRooms()
      ]);
      setBuildings(bList || []);
      setRooms(rList || []);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch campus buildings from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
          <Compass className="w-4 h-4" />
          <span>Vignan University Spatial Directory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#142B4A] mt-1">
          Campus Building Explorer
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Select any campus block to inspect individual floor structures, 2D architectural blueprints, laboratory facilities, and real-time classroom occupancy.
        </p>
      </div>

      {/* Backend Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Failed to retrieve data from production backend</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <p className="text-[11px] text-red-500 font-mono mt-0.5">Endpoint: {API_CONFIG.baseUrl}/api/buildings</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse">
              <div className="h-52 bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && buildings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Campus Blocks Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The production backend returned an empty building list for {API_CONFIG.baseUrl}/api/buildings.
          </p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Buildings Grid */}
      {!loading && !error && buildings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {buildings.map(bldg => {
            const bldgRooms = rooms.filter(r => r.buildingId === bldg.id);
            const classrooms = bldgRooms.filter(r => r.type === 'classroom' || r.type === 'seminar_hall');
            const labs = bldgRooms.filter(r => r.type === 'laboratory');

            return (
              <div
                key={bldg.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Building Image */}
                <div className="relative h-60 overflow-hidden bg-slate-100">
                  <img
                    src={bldg.imageUrl}
                    alt={bldg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 text-xs font-mono font-bold bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200">
                      {bldg.originalCode}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-xl font-extrabold text-white leading-tight drop-shadow-sm">
                      {bldg.name}
                    </h3>
                    <p className="text-xs text-blue-200 mt-0.5">
                      {bldg.departments?.join(' • ') || ''}
                    </p>
                  </div>
                </div>

                {/* Specs & Description */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {bldg.description}
                  </p>

                  {/* Building Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Floors</span>
                      <span className="font-extrabold text-slate-800 text-sm">{bldg.totalFloors}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Classrooms</span>
                      <span className="font-extrabold text-slate-800 text-sm">{classrooms.length}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Labs</span>
                      <span className="font-extrabold text-teal-700 text-sm">{labs.length}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {bldg.established ? `Est. ${bldg.established}` : ''}
                    </span>

                    <Link
                      to={`/campus/${bldg.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#142B4A] group-hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <span>Inspect Blueprints</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
