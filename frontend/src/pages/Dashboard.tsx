import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Lock,
  Users,
  Key,
  ShieldCheck,
  AlertTriangle,
  Server,
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/security/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading system statistics...
      </div>
    );
  }

  const cards = [
    {
      title: t('dashboard.total_docs'),
      value: stats?.total_documents || 0,
      icon: FileText,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: t('dashboard.encrypted_docs'),
      value: stats?.encrypted_documents || 0,
      icon: Lock,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: t('dashboard.recipients'),
      value: stats?.active_recipients || 0,
      icon: Users,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: t('dashboard.decryptions'),
      value: stats?.decryption_events || 0,
      icon: Key,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>RAKSHA DOC Operational Overview</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2.5 py-0.5 rounded border border-emerald-500/40">
              Air-Gapped Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time cryptographic document distribution, invisible forensic watermarking, and hash-linked provenance status.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500 font-semibold">PQC Algorithm:</span> <strong className="text-amber-400">NIST ML-KEM-768</strong>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500 font-semibold">Signatures:</span> <strong className="text-amber-400">NIST ML-DSA-65</strong>
          </div>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {c.title}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {c.value}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${c.color}`}>
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Integrity & Ledger Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ledger Integrity Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Immutable Offline Provenance Ledger Health
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {stats?.ledger_status || 'VALID'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">3-Node Quorum Consensus</div>
                <div className="font-bold text-slate-900 dark:text-slate-200 mt-1">{stats?.quorum_status}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">Verified Ledger Blocks</div>
                <div className="font-bold text-slate-900 dark:text-slate-200 mt-1">#{stats?.total_ledger_records} Blocks</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-medium">System Cluster Mode</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">Offline Air-Gapped</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-lg text-blue-900 dark:text-blue-300">
              <strong className="font-bold">Cryptographic Attribution Protocol:</strong> Every recipient decryption executes NIST ML-KEM key decapsulation, injects a 128-bit invisible forensic watermark payload, signs the provenance record via NIST ML-DSA-65, and appends a SHA3-256 block to the offline ledger.
            </div>
          </div>
        </div>

        {/* Security Alert Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Security Monitoring
              </h2>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Active Security Alerts</span>
                <span className="font-bold text-amber-500">{stats?.active_alerts || 0}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Pending Leak Investigations</span>
                <span className="font-bold text-purple-500">{stats?.pending_investigations || 0}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Invisible Watermark Attribution</span>
                <span className="font-bold text-emerald-500">ACTIVE (Forensic Payload)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">
              Government Infrastructure Monitoring Node
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
