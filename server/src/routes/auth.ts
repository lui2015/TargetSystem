import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { signToken, authMiddleware, AuthRequest } from '../auth';

const router = Router();

// 用户名规则：3-32 位，字母/数字/下划线/中划线/点
const usernameSchema = z
  .string()
  .min(3, '用户名至少 3 位')
  .max(32, '用户名最多 32 位')
  .regex(/^[A-Za-z0-9_.-]+$/, '用户名仅支持字母/数字/下划线/中划线/点');

const registerSchema = z.object({
  // 兼容旧字段名 email：前端传 username，这里同时接受
  username: usernameSchema.optional(),
  email: usernameSchema.optional(),
  password: z.string().min(6).max(64),
  name: z.string().min(1).max(32).optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const username = (parsed.data.username || parsed.data.email || '').toLowerCase();
  if (!username) return res.status(400).json({ error: '用户名必填' });
  const { password } = parsed.data;
  const name = parsed.data.name?.trim() || username;

  const exists = await prisma.user.findUnique({ where: { email: username } });
  if (exists) return res.status(409).json({ error: '用户名已被占用' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: username, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  const token = signToken(user.id);
  res.json({ token, user: { ...user, username: user.email } });
});

const loginSchema = z.object({
  username: usernameSchema.optional(),
  email: usernameSchema.optional(),
  password: z.string(),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const username = (parsed.data.username || parsed.data.email || '').toLowerCase();
  if (!username) return res.status(400).json({ error: '用户名必填' });
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: username } });
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: '用户名或密码错误' });

  const token = signToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.email,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return res.json(null);
  res.json({ ...user, username: user.email });
});

export default router;
