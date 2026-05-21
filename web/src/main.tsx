import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { applyTheme, useTheme } from './store/theme';

// 启动时立即应用持久化主题，避免首屏闪烁
applyTheme(useTheme.getState().theme);

// BASE_URL 由 Vite 注入：生产为 '/TargetSystem/'，开发为 '/'
const BASE_URL = ((import.meta as any).env?.BASE_URL as string) || '/';
// react-router basename 不需要末尾斜杠
const ROUTER_BASE = BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={ROUTER_BASE}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
