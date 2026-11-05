import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Building2 } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <span className="text-6xl font-black text-blue-600 font-mono">404</span>
        <h2 className="text-2xl font-extrabold text-[#142B4A]">Campus Page Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested campus resource, building route, or dashboard path does not exist.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Campus Pulse Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

