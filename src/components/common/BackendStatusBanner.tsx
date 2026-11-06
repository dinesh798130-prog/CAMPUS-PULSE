import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { API_CONFIG } from '../../config/apiConfig';
import { AlertTriangle, CheckCircle2, RefreshCw, Server } from 'lucide-react';

export const BackendStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<{
    checking: boolean;
    online: boolean;
    code: number;
    message: string;
  }>({
    checking: true,
    online: false,
    code: 0,
    message: 'Testing connection to production backend...'
  });

  const runCheck = async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    const result = await apiClient.checkHealth();
    setStatus({
      checking: false,
      online: result.ok,
      code: result.status,
      message: result.ok
        ? 'Production backend connected successfully.'
        : `Backend response: HTTP ${result.status} - ${result.message}`
    });
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (status.online) {
    return (
      <div className="bg-emerald-900 text-emerald-100 text-xs px-4 py-1.5 flex items-center justify-between border-b border-emerald-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong>Backend Connected:</strong> {API_CONFIG.baseUrl}</span>
        </div>
        <span className="text-[10px] font-mono opacity-80">HTTP 200 OK</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-950 text-amber-200 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-amber-800">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-bold">Production API Status: </span>
          <span className="font-mono text-[11px] text-amber-300">
            {API_CONFIG.baseUrl}/api/health
          </span>
          <span className="ml-2 font-semibold text-amber-400">
            ({status.checking ? 'Connecting...' : status.message})
          </span>
        </div>
      </div>

      <button
        onClick={runCheck}
        disabled={status.checking}
        className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${status.checking ? 'animate-spin' : ''}`} />
        <span>Check Again</span>
      </button>
    </div>
  );
};
