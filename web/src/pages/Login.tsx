import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
      const payload: any = { email, password };
      if (mode === 'register') payload.name = name;
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
    <div className="min-h-screen flex items-center justify-center px-4 scanlines">
      <div className="absolute top-4 right-4 w-56">
        <ThemeSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold neon-text font-display">TargetSystem</div>
          <div className="text-muted mt-2">科学管理目标，坚持成为更好的自己</div>
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
          {mode === 'register' && (
            <div>
              <label className="label">昵称</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={32}
              />
            </div>
          )}
          <div>
            <label className="label">邮箱</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
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
            />
          </div>
          {err && <div className="text-sm text-danger">{err}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
