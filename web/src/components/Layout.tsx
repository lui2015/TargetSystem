import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import ThemeSwitcher from './ThemeSwitcher';

const navs = [
  { to: '/today', label: '今日', icon: '☀️' },
  { to: '/objectives', label: '目标', icon: '🎯' },
  { to: '/habits', label: '习惯', icon: '🔁' },
  { to: '/review', label: '复盘', icon: '📝' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex scanlines">
      <aside className="w-60 bg-surface/80 backdrop-blur border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-xl font-bold neon-text font-display">TargetSystem</div>
          <div className="text-xs text-subtle mt-1">让目标变成现实</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navs.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm transition ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium border border-accent/30'
                    : 'text-muted hover:bg-surface-2'
                }`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-3">
          <ThemeSwitcher />
        </div>
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-default">{user?.name}</div>
              <div className="text-xs text-subtle truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="mt-3 w-full text-xs text-muted hover:text-default"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
