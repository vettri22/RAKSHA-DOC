import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Key, ShieldCheck, Eye, CheckCircle2, Lock } from 'lucide-react';

export const RecipientDecryption: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<any>(null);

  useEffect(() => {
    fetchAssignedDocuments();
  }, []);

  const fetchAssignedDocuments = async () => {
    try {
      const res = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data.filter((d: any) => d.is_encrypted && d.is_authorized_recipient));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecrypt = async (docId: string) => {
    setDecrypting(docId);
    setDecryptionResult(null);

    try {
      const res = await axios.post(`/api/decryption/${docId}/execute`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDecryptionResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('This account is not authorized for this document. Sign in with an account selected during distribution, such as officer_a, officer_b, or officer_c.');
      } else {
        alert(err.response?.data?.detail || 'Decryption failed');
      }
    } finally {
      setDecrypting(null);
    }
  };

  const handleOpenWatermarkedFile = () => {
    if (!decryptionResult) return;
    navigate(`/viewer/${decryptionResult.decryption_session_id}`);
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          My Assigned Documents & Recryption Station
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Decrypt authorized files with your PQC credentials. Each decryption embeds a unique 128-bit invisible forensic watermark.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Encrypted Documents Available for Decryption ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {user?.role === 'RECIPIENT'
                ? 'No documents have been distributed to this recipient account yet.'
                : 'Sign in as an authorized recipient (officer_a, officer_b, or officer_c) to view and decrypt assigned documents.'}
            </div>
          ) : documents.map(doc => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{doc.title}</span>
                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30">
                    {doc.classification}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Filename: {doc.filename} | Dept: {doc.department_name}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  SHA3: {doc.sha3_256_hash.substring(0, 16)}...
                </div>
              </div>

              <button
                onClick={() => handleDecrypt(doc.id)}
                disabled={decrypting === doc.id}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>{decrypting === doc.id ? 'Decapsulating & Watermarking...' : 'Decrypt Document (ML-KEM)'}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Protected Document Viewer Side Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Decryption Provenance Receipt</span>
            </h2>

            {decryptionResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Decrypted & Watermarked Successfully</span>
                  </div>
                  <div className="text-[11px] font-mono">Session ID: {decryptionResult.session_id}</div>
                </div>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <div><strong>Forensic ID:</strong> <span className="text-amber-500">{decryptionResult.forensic_identifier}</span></div>
                  <div><strong>ML-DSA Signature:</strong> <span className="text-emerald-500">VERIFIED (FIPS 204)</span></div>
                  <div><strong>Ledger Block Index:</strong> #{decryptionResult.ledger_block_index}</div>
                  <div><strong>Ledger Block Hash:</strong> {decryptionResult.ledger_block_hash.substring(0, 16)}...</div>
                </div>

                {/* PDF Viewer Download Link */}
                <button
                  type="button"
                  onClick={handleOpenWatermarkedFile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Watermarked Document in PDF Viewer</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Execute decryption to generate your recipient-specific watermarked artifact and ML-DSA provenance record.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-mono">
            Invisible Forensic Watermark Engine v1.0
          </div>
        </div>

      </div>

    </div>
  );
};
