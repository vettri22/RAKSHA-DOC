import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const SecurityAlerts: React.FC = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('/api/security/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <span>Real-Time Security Monitoring & Audit Log</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Automated security event auditing, anomaly detection rules, and compliance logs.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            System Security Event Log ({alerts.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading security logs...</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.map(a => (
              <div key={a.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition flex items-start space-x-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{a.title}</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getSeverityBadge(a.severity)}`}>
                      {a.severity}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">{a.description}</div>
                  <div className="text-[10px] font-mono text-slate-400">{a.created_at}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
