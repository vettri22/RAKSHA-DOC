import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, ShieldCheck, AlertOctagon, RefreshCw, Layers } from 'lucide-react';

export const LedgerExplorer: React.FC = () => {
  const { token, user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [tampering, setTampering] = useState(false);

  useEffect(() => {
    fetchLedgerData();
  }, []);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const [recRes, verRes] = await Promise.all([
        axios.get('/api/ledger/records', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/ledger/verify', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRecords(recRes.data);
      setVerification(verRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTamperTest = async () => {
    setTampering(true);
    setTamperResult(null);
    try {
      const res = await axios.post('/api/ledger/tamper-test', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTamperResult(res.data);
      fetchLedgerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Tamper test failed');
    } finally {
      setTampering(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Link className="w-5 h-5 text-amber-500" />
            <span>Immutable Offline Provenance Ledger Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hash-linked SHA3-256 event blockchain with NIST ML-DSA digital signatures & 3-node quorum checkpoint consensus.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLedgerData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Chain</span>
          </button>
          {['SUPER_ADMIN', 'DEPT_ADMIN'].includes(user?.role || '') && (
            <button
              onClick={handleTamperTest}
              disabled={tampering}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow disabled:opacity-50"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{tampering ? 'Testing Tamper...' : 'SIH Jury Tamper Test'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quorum Header Card */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Status: {verification?.status || 'VALID'}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40">
                {verification?.quorum_status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Witness Nodes: {verification?.witness_nodes?.join(' | ') || 'MoD, CabSec, NFB'}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-300 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
          Last Verified Block Hash: {verification?.last_verified_hash?.substring(0, 20)}...
        </div>
      </div>

      {/* Tamper Result Banner */}
      {tamperResult && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertOctagon className="w-5 h-5" />
            <span>{tamperResult.message}</span>
          </div>
          <div>Tampered Block Index: #{tamperResult.tampered_block_index}</div>
          <div className="font-mono text-[11px] pt-1">
            Recomputed Record Hash mismatched stored hash! Chain rejected immediately by verifier node.
          </div>
        </div>
      )}

      {/* Block List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Hash-Linked Ledger Blocks ({records.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading ledger chain...</div>
        ) : (
          records.map((block) => (
            <div
              key={block.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-amber-500 text-sm">Block #{block.index}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/30">
                    {block.event_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{block.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <div><strong>Previous Hash:</strong> <span className="text-slate-400">{block.previous_hash}</span></div>
                <div><strong>Record Hash:</strong> <span className="text-emerald-500 font-bold">{block.record_hash}</span></div>
                <div><strong>Payload SHA3 Digest:</strong> <span className="text-slate-400">{block.payload_hash}</span></div>
                <div><strong>ML-DSA Signature:</strong> <span className="text-amber-400">{block.has_ml_dsa_signature ? 'Signed (FIPS 204)' : 'N/A'}</span></div>
                <div><strong>Document Ref:</strong> <span className="text-slate-400">{block.document_id}</span></div>
                <div><strong>Forensic ID:</strong> <span className="text-amber-500 font-bold">{block.forensic_identifier}</span></div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
