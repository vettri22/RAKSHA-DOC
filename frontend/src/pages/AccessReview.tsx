import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, LogOut, RefreshCw, ShieldAlert, UserCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessControlData {
  requests: any[];
  active_sessions: any[];
  events: any[];
  locked_accounts: any[];
}

export const AccessReview: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<AccessControlData>({ requests: [], active_sessions: [], events: [], locked_accounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(false), 10000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const refresh = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await axios.get<AccessControlData>('/api/auth/admin/access-control', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Could not load account access activity.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const reviewRequest = async (requestId: string, approved: boolean) => {
    setWorking(requestId);
    setError(null);
    try {
      await axios.post(`/api/auth/admin/access-requests/${requestId}/review`, {
        approved,
        note: approved ? 'Approved by super-admin after identity review.' : 'Denied by super-admin after review.'
      }, { headers: { Authorization: `Bearer ${token}` } });
      await refresh();
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Could not review this request.');
    } finally {
      setWorking(null);
    }
  };

  const unlockAccount = async (username: string) => {
    setWorking(username);
    setError(null);
    try {
      await axios.post(`/api/auth/admin/accounts/${encodeURIComponent(username)}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refresh();
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Could not unlock this account.');
    } finally {
      setWorking(null);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setWorking(sessionId);
    setError(null);
    try {
      await axios.post(`/api/auth/admin/sessions/${sessionId}/revoke`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refresh();
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Could not revoke this session.');
    } finally {
      setWorking(null);
    }
  };

  const formatTime = (value: string) => new Date(value).toLocaleString();
  const pendingRequests = data.requests.filter(item => item.status === 'PENDING');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Account Access Review
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review login approvals, failed attempts, account locks, and active devices.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pending sign-in approvals ({pendingRequests.length})</h2>
        {loading ? <p className="text-sm text-slate-500">Loading access requests...</p> : pendingRequests.length ? (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Device ID</th><th className="px-4 py-3">IP address</th><th className="px-4 py-3">User agent</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Review</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pendingRequests.map(item => (
                  <tr key={item.id} className="bg-white align-top dark:bg-slate-950">
                    <td className="px-4 py-3 font-semibold">{item.username}</td>
                    <td className="px-4 py-3 font-mono">{item.device_id}</td>
                    <td className="px-4 py-3">{item.ip_address || 'Unknown'}</td>
                    <td className="max-w-xs px-4 py-3 break-words">{item.user_agent || 'Unknown'}</td>
                    <td className="px-4 py-3">{formatTime(item.requested_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" title="Approve login" aria-label={`Approve ${item.username}`} disabled={working === item.id} onClick={() => void reviewRequest(item.id, true)} className="rounded border border-emerald-600/40 p-1.5 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"><Check className="h-4 w-4" /></button>
                        <button type="button" title="Deny login" aria-label={`Deny ${item.username}`} disabled={working === item.id} onClick={() => void reviewRequest(item.id, false)} className="rounded border border-rose-600/40 p-1.5 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"><X className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="rounded-md border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">No pending sign-in requests.</p>}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Locked accounts ({data.locked_accounts.length})</h2>
          {data.locked_accounts.length ? data.locked_accounts.map(account => (
            <div key={account.user_id} className="flex items-center justify-between gap-3 rounded-md border border-rose-500/20 bg-white px-4 py-3 text-xs dark:bg-slate-900">
              <div><div className="font-bold text-slate-900 dark:text-white">{account.username}</div><div className="mt-1 text-slate-500">{account.failed_attempts} failed attempts · {account.locked_at ? formatTime(account.locked_at) : 'time unknown'}</div></div>
              <button type="button" disabled={working === account.username} onClick={() => void unlockAccount(account.username)} className="rounded-md bg-amber-500 px-3 py-2 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">Unlock</button>
            </div>
          )) : <p className="rounded-md border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">No locked accounts.</p>}
        </div>

        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><UserCheck className="h-4 w-4 text-emerald-500" />Active device sessions ({data.active_sessions.length})</h2>
          {data.active_sessions.length ? data.active_sessions.map(session => (
            <div key={session.id} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="font-bold text-slate-900 dark:text-white">{session.username}</div>
              <div className="mt-1 text-slate-500">Device {session.device_id} · {session.ip_address || 'Unknown IP'}</div>
              <div className="mt-1 text-slate-500">Started {formatTime(session.created_at)} · expires {formatTime(session.expires_at)}</div>
              <button type="button" disabled={working === session.id} onClick={() => void revokeSession(session.id)} className="mt-2 inline-flex items-center gap-1 rounded border border-rose-600/40 px-2 py-1 text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"><LogOut className="h-3.5 w-3.5" /> Revoke session</button>
            </div>
          )) : <p className="rounded-md border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">No active sessions.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent authentication activity ({data.events.length})</h2>
        <div className="max-h-[28rem] overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">IP / device</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.events.map(event => <tr key={event.id} className="bg-white align-top dark:bg-slate-950"><td className="whitespace-nowrap px-4 py-3">{formatTime(event.created_at)}</td><td className="px-4 py-3 font-semibold">{event.username}</td><td className="px-4 py-3">{event.event_type}</td><td className="px-4 py-3">{event.outcome}</td><td className="px-4 py-3">{event.ip_address || 'Unknown'}<br /><span className="font-mono text-slate-500">{event.device_id || ''}</span></td><td className="px-4 py-3">{event.details || ''}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};