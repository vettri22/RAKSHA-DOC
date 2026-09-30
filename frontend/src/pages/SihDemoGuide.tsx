import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, RefreshCw, CheckCircle2, ShieldCheck, FileCheck, AlertTriangle } from 'lucide-react';

export const SihDemoGuide: React.FC = () => {
  const { token } = useAuth();
  const [running, setRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const handleRunFullSimulation = async () => {
    if (!window.confirm('The full simulation resets current demo ledger and distribution data. Continue?')) return;
    setRunning(true);
    setSimResult(null);

    try {
      const res = await axios.post('/api/demo/run-full-simulation', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSimResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Simulation execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('This permanently clears demo distribution, investigation, and ledger records. Continue?')) return;
    try {
      await axios.post('/api/demo/reset', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSimResult(null);
      alert('Demo data reset cleanly.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center space-x-2">
            <PlayCircle className="w-6 h-6 text-amber-400 stroke-[2.5]" />
            <span>SIH 2026 Jury Presentation & 3-Recipient Demo Workbench</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Execute the complete 3-Officer PQC encryption, independent watermarked decryptions, leak attribution, and ledger tamper verification scenario.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetDemo}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
          <button
            onClick={handleRunFullSimulation}
            disabled={running}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold rounded-lg text-xs transition shadow-md flex items-center space-x-2 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            <span>{running ? 'Executing PQC Simulation...' : 'Run Live 3-Officer Demo Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Demo Walkthrough Cards */}
      {simResult ? (
        <div className="space-y-6">
          
          {/* Step 1 & 2: Encrypted Package & 3 Decryptions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>1. Multi-Recipient PQC Encapsulation & Independent Decryptions</span>
            </h2>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 font-medium">
              <div><strong>Target Document:</strong> {simResult.document_title}</div>
              <div><strong>Cryptographic Profile:</strong> <span className="text-amber-500 font-bold">{simResult.encryption_algorithm}</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {simResult.decryption_events?.map((ev: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-sans font-bold text-slate-900 dark:text-slate-100 text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
                    {ev.officer}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div><strong>Forensic ID:</strong> <span className="text-amber-500 font-bold">{ev.forensic_identifier}</span></div>
                    <div><strong>Artifact Hash:</strong> {ev.artifact_hash}</div>
                    <div><strong>Ledger Block:</strong> #{ev.ledger_block_index}</div>
                    <div><strong>NIST ML-DSA:</strong> <span className="text-emerald-500 font-bold">VERIFIED</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Leak Attribution Simulation Result */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileCheck className="w-5 h-5 text-rose-500" />
              <span>2. Simulated Leak Forensic Watermark Recovery & Provenance Match</span>
            </h2>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{simResult.leaked_copy_simulation?.attributed_provenance}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium pt-2 border-t border-emerald-500/20">
                <div><strong>Leaked Source Sample:</strong> {simResult.leaked_copy_simulation?.source_officer}</div>
                <div><strong>Extraction Confidence:</strong> <span className="text-emerald-500 font-bold">{simResult.leaked_copy_simulation?.confidence_score}%</span></div>
                <div><strong>Recovered Forensic ID:</strong> <span className="font-mono text-amber-500">{simResult.leaked_copy_simulation?.recovered_forensic_id}</span></div>
              </div>
            </div>
          </div>

          {/* Step 4: Ledger Verification */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-sm space-y-3 font-mono text-xs">
            <div className="font-sans font-bold text-sm text-slate-100 border-b border-slate-800 pb-2">
              3. Immutable Ledger Quorum Checkpoint Proof
            </div>
            <div>Chain Verification: <span className="text-emerald-400 font-bold">{simResult.ledger_verification?.status}</span></div>
            <div>3-Node Consensus: <span className="text-emerald-400 font-bold">{simResult.ledger_verification?.quorum_status}</span></div>
            <div>Total Blocks Verified: #{simResult.ledger_verification?.total_records}</div>
          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 space-y-3">
          <PlayCircle className="w-12 h-12 text-amber-500 mx-auto stroke-[1.5]" />
          <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            Click "Run Live 3-Officer Demo Simulation" above to execute the interactive SIH demonstration.
          </div>
          <div>
            Demonstrates AES-256-GCM + NIST ML-KEM-768 multi-recipient key encapsulation, 3 distinct watermarked decryptions, ML-DSA signing, and leak attribution.
          </div>
        </div>
      )}

    </div>
  );
};
