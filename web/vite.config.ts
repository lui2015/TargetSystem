import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 子路径部署：生产构建时所有静态资源 URL 会自动带上 /TargetSystem/ 前缀
  // 开发时 base 为 '/'，不影响 vite dev 服务
  base: process.env.NODE_ENV === 'production' ? '/TargetSystem/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
