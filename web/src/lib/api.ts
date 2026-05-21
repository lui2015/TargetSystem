import { useAuth } from '../store/auth';

// 支持通过 VITE_API_BASE 指定后端 API 基址（跨域部署时使用）
// - 开发默认走 vite 代理：'/api'
// - 生产可通过构建时环境变量覆盖，例如 https://api.example.com/api
const ENV_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined;
const BASE = (ENV_BASE && ENV_BASE.trim()) || '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) {
    useAuth.getState().logout();
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error?.formErrors?.[0] || (data as any)?.error || 'Request failed');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
