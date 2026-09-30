import React, { useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';

interface LoginResponse {
  access_token: string;
  user: UserProfile;
}

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">Checking session...</div>;
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let deviceId = localStorage.getItem('raksha_device_id');
      if (!deviceId) {
        deviceId = typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('raksha_device_id', deviceId);
      }
      const response = await axios.post<LoginResponse>('/api/auth/login', { username, password, device_id: deviceId });
      login(response.data.access_token, response.data.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      if (axios.isAxiosError(err) && err.response?.status === 423) setLocked(true);
      setError(typeof detail === 'string' ? detail : 'Sign-in failed. Check the backend connection and your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-100 dark:bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-900 px-7 py-6 dark:border-slate-800">
          <div className="mb-4 inline-flex rounded-lg bg-amber-500 p-2 text-slate-950">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">RAKSHA DOC</h1>
          <p className="mt-1 text-sm text-slate-300">Sign in to the secure document portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-7 py-6">
          {error && (
            <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
            <input
              id="username"
              autoComplete="username"
              required
              value={username}
              onChange={event => setUsername(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={locked}
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || locked}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />
            {submitting ? 'Signing in...' : locked ? 'Locked pending admin review' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">Demo account: dept_admin / admin123</p>
        </form>
      </section>
    </main>
  );
};