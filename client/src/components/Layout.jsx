import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Users, LayoutGrid, LogOut, ArrowRightLeft, Trophy, Plus, ShieldCheck } from 'lucide-react';
import QuickAddModal from './QuickAddModal.jsx';

const NAV_ITEMS = [
  { to: '/',         end: true, icon: Users,          label: 'Prospects' },
  { to: '/board',    end: false, icon: LayoutGrid,     label: 'Board'     },
  { to: '/portal',   end: false, icon: ArrowRightLeft, label: 'Portal'    },
  { to: '/my-team',  end: false, icon: Trophy,         label: 'My Team'   },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [quickAdd, setQuickAdd] = useState(false);

  const canEdit = user?.role === 'head_coach' || user?.role === 'assistant';

  const initials = user?.fullName
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const sideNavCls = ({ isActive }) =>
    ['flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
    ].join(' ');

  const bottomNavCls = ({ isActive }) =>
    ['flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors min-w-0',
      isActive ? 'text-blue-400' : 'text-slate-500',
    ].join(' ');

  return (
    <div className="flex h-screen bg-slate-50">

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-60 bg-slate-900 flex-col fixed h-full z-10 shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">SR</span>
            </div>
            <span className="text-white font-semibold text-[15px]">Simple Recruit</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={sideNavCls}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
          {user?.role === 'head_coach' && (
            <NavLink to="/admin/users" className={sideNavCls}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Manage Users
            </NavLink>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="md:ml-60 flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={bottomNavCls}>
            <Icon className="w-5 h-5" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Quick-add FAB (mobile only, coaches only) ── */}
      {canEdit && (
        <button
          onClick={() => setQuickAdd(true)}
          className="md:hidden fixed bottom-18 right-4 z-50 w-14 h-14 bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center"
          aria-label="Quick add prospect"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {quickAdd && (
        <QuickAddModal onClose={() => setQuickAdd(false)} />
      )}
    </div>
  );
}
