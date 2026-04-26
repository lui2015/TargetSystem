import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import objectivesRouter from './routes/objectives';
import habitsRouter from './routes/habits';
import checkInsRouter from './routes/checkins';
import tasksRouter from './routes/tasks';
import reviewsRouter from './routes/reviews';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRouter);
app.use('/api/objectives', objectivesRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/checkins', checkInsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reviews', reviewsRouter);

// 生产模式：托管前端静态资源（单端口交付，避免跨域/反向代理）
const webDist = process.env.WEB_DIST || path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback：所有非 /api 路径回到 index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
  console.log(`📦 serving web dist: ${webDist}`);
} else {
  console.log(`ℹ️  web dist not found at ${webDist}, API-only mode`);
}

// 全局错误兜底
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 Target System running on http://${host}:${port}`);
});
