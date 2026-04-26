import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
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
  hydrate: () => {
    const token = localStorage.getItem('ts_token');
    const userStr = localStorage.getItem('ts_user');
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch {
        /* ignore */
      }
    }
  },
}));
