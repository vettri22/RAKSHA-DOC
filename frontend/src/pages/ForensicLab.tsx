import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, ShieldAlert, FileCheck, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ForensicLab: React.FC = () => {
  const { token } = useAuth();
  const [caseTitle, setCaseTitle] = useState('Suspected Defence Leak Investigation');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('title', caseTitle);
    formData.append('file', file);

    try {
      const res = await axios.post('/api/forensics/cases', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Forensic investigation failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!result) return;

    try {
      const response = await axios.get(result.report_url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${result.case_number}_evidence_report.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Evidence report download failed');
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Search className="w-5 h-5 text-amber-500" />
          <span>Forensic Leak Attribution & Provenance Workbench</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Extract invisible forensic watermarks, verify ML-DSA signatures, cross-reference offline ledger blocks, and generate court-ready evidence reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upload Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Submit Evidence Artifact</span>
          </h2>

          <form onSubmit={handleRunInvestigation} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Investigation Case Title</label>
              <input
                type="text"
                required
                value={caseTitle}
                onChange={e => setCaseTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Leaked Document Copy (PDF / Image)</label>
              <input
                type="file"
                required
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing || !file}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-lg transition text-xs shadow flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{analyzing ? 'Extracting & Cross-Referencing Ledger...' : 'Run Forensic Watermark Extraction'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Investigation Results */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Forensic Analysis & Cryptographic Attribution Passport</span>
              </span>
              {result && (
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  result.extraction_results?.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                }`}>
                  {result.status}
                </span>
              )}
            </h2>

            {result ? (
              <div className="space-y-4 text-xs">
                
                {/* Confidence Metric Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 font-medium">Extraction Confidence</div>
                    <div className="text-2xl font-extrabold text-emerald-500 mt-1">
                      {result.extraction_results?.confidence_score}%
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 font-medium">Extraction Layer</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-2">
                      {result.extraction_results?.extraction_layer || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 font-medium">Transformation Observed</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-2">
                      {result.extraction_results?.transformation_detected || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Attributed Officer Card */}
                {result.attributed_recipient ? (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">Cryptographically Attributed Officer Match</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 dark:text-slate-300 pt-2 border-t border-emerald-500/20 font-medium">
                      <div><strong>Officer:</strong> {result.attributed_recipient.full_name}</div>
                      <div><strong>Username:</strong> {result.attributed_recipient.username}</div>
                      <div><strong>Role:</strong> {result.attributed_recipient.role}</div>
                      <div><strong>Department:</strong> {result.attributed_recipient.department}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium">
                    No matching officer record found in offline ledger for recovered payload.
                  </div>
                )}

                {/* Verification Indicators */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>NIST ML-DSA Digital Signature</span>
                    <span className={result.signature_verified ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                      {result.signature_verified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>Offline Blockchain Ledger Proof</span>
                    <span className={result.ledger_verified ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                      {result.ledger_verified ? 'VALID' : 'INVALID'}
                    </span>
                  </div>
                </div>

                {/* Export Report PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Court-Ready Signed PDF Evidence Report</span>
                </button>

              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                Upload evidence file to execute forensic watermark extraction & cryptographic ledger cross-matching.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-mono">
            RAKSHA DOC Forensic Investigation Pipeline
          </div>
        </div>

      </div>

    </div>
  );
};
