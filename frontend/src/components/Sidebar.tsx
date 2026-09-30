import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  FileText,
  Send,
  Key,
  Search,
  Link,
  ShieldAlert,
  PlayCircle,
  UserCog
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const role = user?.role || 'SUPER_ADMIN';

  const navItems = [
    {
      to: '/',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT', 'INVESTIGATOR']
    },
    {
      to: '/documents',
      label: t('nav.documents'),
      icon: FileText,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN']
    },
    {
      to: '/distribution',
      label: t('nav.distribution'),
      icon: Send,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN']
    },
    {
      to: '/my-documents',
      label: t('nav.decryption'),
      icon: Key,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT']
    },
    {
      to: '/forensics',
      label: t('nav.forensics'),
      icon: Search,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR']
    },
    {
      to: '/ledger',
      label: t('nav.ledger'),
      icon: Link,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'RECIPIENT', 'INVESTIGATOR']
    },
    {
      to: '/alerts',
      label: t('nav.alerts'),
      icon: ShieldAlert,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN', 'INVESTIGATOR']
    },
    {
      to: '/sih-demo',
      label: t('nav.sih_demo'),
      icon: PlayCircle,
      roles: ['SUPER_ADMIN', 'DEPT_ADMIN']
    },
    {
      to: '/access-review',
      label: t('nav.access_review'),
      icon: UserCog,
      roles: ['SUPER_ADMIN']
    }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div>
        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Government Portal Navigation
        </div>
        <nav className="space-y-1 mt-2">
          {filteredItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-amber-500/80" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Badge */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="font-bold text-slate-200">RAKSHA DOC v1.0</div>
        <div>SIH 2026 PS ID: 26237</div>
        <div className="text-[10px] text-amber-400 font-mono">Team: VS TECH</div>
      </div>
    </aside>
  );
};
