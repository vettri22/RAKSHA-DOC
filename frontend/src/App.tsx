import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { DocumentVault } from './pages/DocumentVault';
import { DocumentDistribution } from './pages/DocumentDistribution';
import { RecipientDecryption } from './pages/RecipientDecryption';
import { ForensicLab } from './pages/ForensicLab';
import { LedgerExplorer } from './pages/LedgerExplorer';
import { SecurityAlerts } from './pages/SecurityAlerts';
import { SihDemoGuide } from './pages/SihDemoGuide';
import { Login } from './pages/Login';
import { AccessReview } from './pages/AccessReview';

const ProtectedDocumentViewer = lazy(() => import('./pages/ProtectedDocumentViewer').then(module => ({ default: module.ProtectedDocumentViewer })));

const MainLayout: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">Checking session...</div>;
  }

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN']}><DocumentVault /></RoleGate>} />
            <Route path="/distribution" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN']}><DocumentDistribution /></RoleGate>} />
            <Route path="/my-documents" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT']}><RecipientDecryption /></RoleGate>} />
            <Route path="/viewer/:sessionId" element={
              <RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT', 'INVESTIGATOR']}>
                <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading protected viewer...</div>}>
                  <ProtectedDocumentViewer />
                </Suspense>
              </RoleGate>
            } />
            <Route path="/forensics" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR']}><ForensicLab /></RoleGate>} />
            <Route path="/ledger" element={<LedgerExplorer />} />
            <Route path="/alerts" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR']}><SecurityAlerts /></RoleGate>} />
            <Route path="/access-review" element={<RoleGate roles={['SUPER_ADMIN']}><AccessReview /></RoleGate>} />
            <Route path="/sih-demo" element={<RoleGate roles={['SUPER_ADMIN', 'DEPT_ADMIN']}><SihDemoGuide /></RoleGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const RoleGate: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? <>{children}</> : <Navigate to="/" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
