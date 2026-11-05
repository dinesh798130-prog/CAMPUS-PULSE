import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { Faculty } from '../../types';
import { Users, Mail, Phone, BookOpen, Search, MapPin } from 'lucide-react';

export const FacultyManager: React.FC = () => {
  const [facultyList] = useState<Faculty[]>(storageService.getFaculty());
  const departments = storageService.getDepartments();
  const subjects = storageService.getSubjects();

  const getDept = (id: string) => departments.find(d => d.id === id);
  const getSubj = (id: string) => subjects.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Faculty Member Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Academic teaching faculty, assigned course curriculums, contact parameters, and faculty research cabins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facultyList.map(fac => {
          const dept = getDept(fac.departmentId);

          return (
            <div key={fac.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm shrink-0">
                    {fac.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{fac.name}</h3>
                    <p className="text-xs text-slate-500">{fac.designation}</p>
                    <span className="font-mono text-[10px] text-blue-700 font-bold">{fac.facultyId}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <p className="font-medium text-slate-800">
                    Department: <strong>{dept?.name || 'Department'}</strong>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{fac.email}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{fac.phone}</span>
                  </p>
                </div>

                {fac.assignedSubjectIds.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Assigned Subjects:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {fac.assignedSubjectIds.map(sid => (
                        <span key={sid} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                          {getSubj(sid)?.name || sid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

