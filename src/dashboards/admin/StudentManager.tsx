import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { Student } from '../../types';
import { GraduationCap, Mail, Building, Users } from 'lucide-react';

export const StudentManager: React.FC = () => {
  const [students] = useState<Student[]>(storageService.getStudents());
  const departments = storageService.getDepartments();
  const sections = storageService.getSections();

  const getDept = (id: string) => departments.find(d => d.id === id);
  const getSec = (id: string) => sections.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Student Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Enrolled student profiles mapped to departments, years of study, and active sections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(stud => {
          const dept = getDept(stud.departmentId);
          const sec = getSec(stud.sectionId);

          return (
            <div key={stud.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-sm shrink-0">
                  {stud.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{stud.name}</h3>
                  <span className="font-mono text-xs text-purple-700 font-bold">{stud.registrationNumber}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                <p>Department: <strong>{dept?.name}</strong></p>
                <p>Section: <strong className="font-mono">{sec?.name || 'Section A'}</strong></p>
                <p className="font-mono text-[11px] text-slate-500">{stud.email}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

