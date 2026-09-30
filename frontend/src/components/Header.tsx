import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { Shield, Search, Sun, Moon, Globe, WifiOff, LogOut, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const searchItems = [
    { to: '/', label: t('nav.dashboard'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT', 'INVESTIGATOR'] },
    { to: '/documents', label: t('nav.documents'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN'] },
    { to: '/distribution', label: t('nav.distribution'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN'] },
    { to: '/my-documents', label: t('nav.decryption'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT'] },
    { to: '/forensics', label: t('nav.forensics'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR'] },
    { to: '/ledger', label: t('nav.ledger'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT', 'INVESTIGATOR'] },
    { to: '/alerts', label: t('nav.alerts'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR'] },
    { to: '/sih-demo', label: t('nav.sih_demo'), roles: ['SUPER_ADMIN', 'DEPT_ADMIN'] }
  ];
  const filteredSearchItems = searchItems.filter(item =>
    item.roles.includes(user?.role || '') && item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const navigateToFirstResult = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && filteredSearchItems.length > 0) {
      navigate(filteredSearchItems[0].to);
      setSearchQuery('');
    }
    if (event.key === 'Escape') setSearchQuery('');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-2 rounded-lg text-slate-950 shadow">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wider text-white">
                {t('app_name')}
              </span>
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                PQC FIPS 203/204
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              {t('department')}
            </p>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              aria-label={t('search_placeholder')}
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={navigateToFirstResult}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl">
                {filteredSearchItems.length ? filteredSearchItems.map(item => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => { navigate(item.to); setSearchQuery(''); }}
                    className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {item.label}
                  </button>
                )) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No matching pages</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Air-Gapped Status Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Air-Gapped Cluster</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900 text-white">English</option>
              <option value="hi" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
              <option value="ta" className="bg-slate-900 text-white">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          {/* User Profile */}
          {user ? (
            <div className="flex items-center space-x-3 border-l border-slate-800 pl-3 sm:pl-4">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-200">{user.full_name}</div>
                <div className="text-[10px] text-amber-400 font-semibold">{t(`roles.${user.role}`)}</div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Demo Mode</span>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
