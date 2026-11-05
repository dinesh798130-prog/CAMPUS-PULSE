import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { Floor, Building } from '../../types';
import { Layers, Plus, Compass, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FloorManager: React.FC = () => {
  const [floors, setFloors] = useState<Floor[]>(storageService.getFloors());
  const buildings = storageService.getBuildings();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Floor & Blueprint Architecture</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Floor levels, spatial blueprints, common facilities, and room allocations across all campus blocks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {floors.map(flr => {
          const bldg = buildings.find(b => b.id === flr.buildingId);
          const isGround = flr.floorNumber === 0;

          return (
            <div key={flr.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-slate-900">{flr.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isGround ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {isGround ? 'Ground / Entrance' : `Level ${flr.floorNumber}`}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>Building: <strong>{bldg?.name || 'Building'} ({bldg?.originalCode})</strong></p>
                <p>Registered Schedulable Rooms: <strong>{flr.roomIds.length}</strong></p>
                <p>Blueprint Layout Blocks: <strong>{flr.blueprintElements.length} Elements</strong></p>
                {isGround && (
                  <p className="text-amber-800 font-medium text-[11px] bg-amber-50 p-1.5 rounded">
                    Ground floor policy: No regular teaching classrooms automatically assigned.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {bldg ? (
                  <Link
                    to={`/campus/${bldg.slug}?floor=${flr.id}`}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Open 2D Blueprint</span>
                  </Link>
                ) : null}
                <span className="text-slate-400 font-mono text-[10px]">ID: {flr.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

