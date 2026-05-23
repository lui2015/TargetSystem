import { create } from 'zustand';

interface User {
  id: string;
  email: string;       // 兼容旧字段（实际承载用户名）
  username?: string;   // 新字段：用户名
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

// 同步从 localStorage 读取，作为 store 的初始值，
// 避免首屏渲染时 token 为 null 被路由 Navigate 到 /login。
function readInitial(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem('ts_token');
    const userStr = localStorage.getItem('ts_user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) as User };
    }
  } catch {
    /* ignore */
  }
  return { token: null, user: null };
}

const initial = readInitial();

export const useAuth = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setAuth: (token, user) => {
    localStorage.setItem('ts_token', token);
    localStorage.setItem('ts_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    set({ token: null, user: null });
  },
  // 兼容现有调用：再次同步一次（一般无需调用）
  hydrate: () => {
    const next = readInitial();
    set({ token: next.token, user: next.user });
  },
}));
