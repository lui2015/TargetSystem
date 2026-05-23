import { useState } from 'react';
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    nav('/login');
  }

  return (
    <div className="min-h-screen md:flex scanlines">
      {/* ===== 桌面端：左侧固定侧边栏 ===== */}
      <aside className="hidden md:flex w-60 bg-surface/80 backdrop-blur border-r border-border flex-col">
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
              <div className="text-xs text-subtle truncate">@{user?.username || user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-xs text-muted hover:text-default"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* ===== 移动端：顶栏 ===== */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-surface/85 backdrop-blur border-b border-border safe-pt">
        <div className="text-base font-bold neon-text font-display truncate">TargetSystem</div>
        <button
          type="button"
          aria-label="打开菜单"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 -mr-2 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold active:scale-95 transition"
        >
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </header>

      {/* ===== 主内容区 ===== */}
      <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* ===== 移动端：底部 Tab Bar ===== */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="主导航"
      >
        {navs.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition ${
                isActive ? 'text-accent' : 'text-muted active:text-default'
              }`
            }
          >
            <span className="text-xl leading-none">{n.icon}</span>
            <span className="leading-none">{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ===== 移动端：右上头像点击后的抽屉（账户 / 主题 / 退出） ===== */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-surface border-l border-border shadow-xl flex flex-col safe-pt"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="font-semibold text-default">账户</div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setDrawerOpen(false)}
                className="text-subtle hover:text-default text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-default truncate">{user?.name}</div>
                  <div className="text-xs text-subtle truncate">
                    @{user?.username || user?.email}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-b border-border">
              <div className="text-xs text-subtle mb-2">主题</div>
              <ThemeSwitcher />
            </div>
            <div className="mt-auto px-5 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  handleLogout();
                }}
                className="btn-secondary w-full"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
