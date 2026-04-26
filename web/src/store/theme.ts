import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'aurora' | 'cyberpunk' | 'midnight' | 'morandi' | 'paper';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string[]; // 用于预览的 3 色
  isDark: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'aurora',
    name: '极光 Aurora',
    description: '清新现代 · 默认',
    swatch: ['#f8fafc', '#4f46e5', '#6366f1'],
    isDark: false,
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克 Cyberpunk',
    description: '霓虹粉紫 × 电子青 · 扫描线网格',
    swatch: ['#0a0614', '#ff2ecc', '#00f0ff'],
    isDark: true,
  },
  {
    id: 'midnight',
    name: '暗夜 Midnight',
    description: '低饱和深蓝 · 护眼',
    swatch: ['#0f111a', '#818cf8', '#2c3352'],
    isDark: true,
  },
  {
    id: 'morandi',
    name: '莫兰迪 Morandi',
    description: '低饱和柔和 · 文艺',
    swatch: ['#f4f0ea', '#9c7d6c', '#d5ccc0'],
    isDark: false,
  },
  {
    id: 'paper',
    name: '纸感 Paper',
    description: '米白墨色 · 专注阅读',
    swatch: ['#faf7f0', '#1e1e1e', '#d6cfbe'],
    isDark: false,
  },
];

interface ThemeState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'aurora',
      setTheme: (t) => set({ theme: t }),
    }),
    { name: 'ts-theme' }
  )
);

/** 将主题应用到 <html>，在 App 启动 & 切换时调用 */
export function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = THEMES.find((t) => t.id === theme);
  document.documentElement.style.colorScheme = meta?.isDark ? 'dark' : 'light';
}
