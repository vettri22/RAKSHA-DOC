import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const DocumentDistribution: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [encrypting, setEncrypting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const docRes = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const undistributedDocuments = docRes.data.filter((document: any) => !document.is_encrypted);
      setDocuments(undistributedDocuments);
      if (undistributedDocuments.length > 0) setSelectedDocId(undistributedDocuments[0].id);

      // Fetch recipient demo accounts
      const seedRes = await axios.post('/api/demo/seed', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const recipientAccounts = seedRes.data?.accounts?.filter((account: any) => account.role.startsWith('Recipient'));
      if (recipientAccounts?.length) {
        const seededRecipients = recipientAccounts.map((account: any) => ({
          id: account.id,
          username: account.user,
          name: account.name,
          role: account.role
        }));
        setRecipients(seededRecipients);
        setSelectedRecipients(seededRecipients.map((recipient: any) => recipient.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleEncryptAndDistribute = async () => {
    if (!selectedDocId || selectedRecipients.length === 0) return;

    setEncrypting(true);
    setResult(null);

    try {
      const res = await axios.post(`/api/documents/${selectedDocId}/encrypt-distribute`, {
        recipient_ids: selectedRecipients
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Encryption failed');
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Post-Quantum Secure Document Distribution
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Encapsulate content keys independently for multiple recipients using NIST ML-KEM-768 (FIPS 203).
        </p>
      </div>

      {/* Distribution Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Selector */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          
          {/* Step 1: Select Document */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Step 1: Select Classified Target Document
            </label>
            <select
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {documents.length === 0 && <option value="">No undistributed documents</option>}
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  [{d.classification}] {d.title} ({d.filename}){d.filename === 'CONFIDENTIAL_DEFENCE_STRATEGY_2026.pdf' ? ' - Demo Sample' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Choose Recipients */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Step 2: Authorize Authorized Officer Recipients
            </label>
            <div className="space-y-2">
              {recipients.map(r => {
                const checked = selectedRecipients.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleRecipient(r.id)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition ${
                      checked
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-slate-100 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div>{r.name} ({r.username})</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      ML-KEM-768 PK Active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleEncryptAndDistribute}
            disabled={encrypting || !selectedDocId || selectedRecipients.length === 0}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-lg transition text-xs shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{encrypting ? 'Encrypting & Encapsulating Keys...' : 'Encrypt & Distribute (NIST ML-KEM-768)'}</span>
          </button>

        </div>

        {/* Right Column: Encapsulation Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Distribution Receipts</span>
            </h2>

            {result ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{result.message}</strong>
                    <div className="mt-1 text-[11px] font-mono">Encrypted Package ID: #{result.encrypted_package_id.substring(0, 12)}...</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Cryptographic Protocol:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 font-mono text-[11px]">
                    <li>Content Key: AES-256-GCM (Fresh 256-bit)</li>
                    <li>KEM Exchange: NIST ML-KEM-768 (FIPS 203)</li>
                    <li>Recipients Encapsulated: {result.recipients_authorized}</li>
                    <li>Ledger Block: Appended to Offline Ledger</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select document and recipients to execute post-quantum key encapsulation.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-mono">
            NIST FIPS 203 Compliant Multi-Recipient Engine
          </div>
        </div>

      </div>

    </div>
  );
};
