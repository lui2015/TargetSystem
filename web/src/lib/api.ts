import { useAuth } from '../store/auth';

// 支持通过 VITE_API_BASE 指定后端 API 基址（跨域部署时使用）
// - 开发默认走 vite 代理：'/api'
// - 生产构建会自动带上 Vite 的 base 前缀（例如 /TargetSystem/api），保证子路径部署不 404
// - 也可通过构建时环境变量 VITE_API_BASE 覆盖，例如 https://api.example.com/api
const ENV_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined;
const VITE_BASE_URL: string = ((import.meta as any).env?.BASE_URL as string) || '/';
// 例：BASE_URL='/TargetSystem/' → '/TargetSystem/api'；BASE_URL='/' → '/api'
const DEFAULT_BASE = VITE_BASE_URL.replace(/\/$/, '') + '/api';
const BASE = (ENV_BASE && ENV_BASE.trim()) || DEFAULT_BASE;

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
    throw new Error(extractErrorMessage(data) || `Request failed (${res.status})`);
  }
  return data as T;
}

// 把后端返回的多种错误结构（字符串 / zod flatten / 对象）抽成可读消息
function extractErrorMessage(data: any): string {
  const err = data?.error;
  if (!err) return '';
  if (typeof err === 'string') return err;
  // zod flatten: { formErrors: string[], fieldErrors: Record<string, string[]> }
  if (Array.isArray(err.formErrors) && err.formErrors.length > 0) {
    return err.formErrors[0];
  }
  if (err.fieldErrors && typeof err.fieldErrors === 'object') {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(err.fieldErrors as Record<string, string[]>)) {
      if (Array.isArray(msgs) && msgs.length > 0) parts.push(`${field}: ${msgs[0]}`);
    }
    if (parts.length > 0) return parts.join('；');
  }
  if (typeof err.message === 'string') return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return '';
  }
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
