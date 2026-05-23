import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const setAuth = useAuth(s => s.setAuth);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = { username: username.trim().toLowerCase(), password };
      const res = await api.post<{ token: string; user: any }>(url, payload);
      setAuth(res.token, res.user);
      nav('/today');
    } catch (e: any) {
      setErr(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col scanlines">
      {/* 顶部主题切换：窄屏占满，桌面端右上角 */}
      <div className="flex justify-end px-4 pt-4 md:pt-4 md:px-6">
        <div className="w-full md:w-56">
          <ThemeSwitcher />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 md:mb-8">
            <div className="text-2xl md:text-3xl font-bold neon-text font-display">TargetSystem</div>
            <div className="text-sm md:text-base text-muted mt-2">
              科学管理目标，坚持成为更好的自己
            </div>
          </div>
          <form onSubmit={submit} className="card space-y-4">
            <div className="flex rounded-[var(--radius)] bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm rounded-[var(--radius)] transition ${
                  mode === 'login' ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted'
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm rounded-[var(--radius)] transition ${
                  mode === 'register' ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted'
                }`}
              >
                注册
              </button>
            </div>
            <div>
              <label className="label">用户名</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_.\-]+"
                autoComplete="username"
                placeholder="3-32 位，字母/数字/下划线/中划线/点"
              />
            </div>
            <div>
              <label className="label">密码</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {err && <div className="text-sm text-danger">{err}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
