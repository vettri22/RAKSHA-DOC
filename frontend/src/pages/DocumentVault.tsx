import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Lock, Shield, CheckCircle2 } from 'lucide-react';

export const DocumentVault: React.FC = () => {
  const { token, logout } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('classification', classification);
    formData.append('file', file);

    try {
      const res = await axios.post('/api/documents', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUploadSuccess(`Document "${res.data.title}" uploaded cleanly. SHA3 Hash: ${res.data.sha3_256_hash.substring(0, 16)}...`);
      setTitle('');
      setDescription('');
      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      if (err.response?.status === 401) {
        logout();
        alert('Your session is invalid or expired. Please sign in again.');
      } else {
        alert(err.response?.data?.detail || 'Document upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'TOP_SECRET':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'SECRET':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'CONFIDENTIAL':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Classified Document Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload, classify, and manage confidential government documents prior to post-quantum distribution.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-4">
          <Upload className="w-4 h-4 text-amber-500" />
          <span>Upload Classified PDF Document</span>
        </h2>

        {uploadSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Defence Cyber Operations Directive"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Classification Level *</label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="INTERNAL">Internal Use Only</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="SECRET">Secret</option>
              <option value="TOP_SECRET">Top Secret / Eyes Only</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">PDF Document File *</label>
            <input
              type="file"
              accept=".pdf"
              required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition text-xs shadow disabled:opacity-50"
            >
              {uploading ? 'Processing & Hashing...' : 'Upload & Compute SHA3'}
            </button>
          </div>
        </form>
      </div>

      {/* Document List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Vault Repository ({documents.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading documents...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Document Title</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">SHA3-256 Hash</th>
                  <th className="px-6 py-3">PQC Status</th>
                  <th className="px-6 py-3">Recipients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{doc.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getClassificationBadge(doc.classification)}`}>
                        {doc.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4">{doc.department_name}</td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                      {doc.sha3_256_hash.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-4">
                      {doc.is_encrypted ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>ML-KEM Encrypted</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Plaintext Unencrypted</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{doc.recipient_count} Officers</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
