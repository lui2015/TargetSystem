import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();
router.use(authMiddleware);

const krSchema = z.object({
  title: z.string().min(1),
  metric: z.string().min(1),
  startValue: z.number().default(0),
  targetValue: z.number().positive(),
  currentValue: z.number().default(0),
  dueDate: z.string(), // ISO
});

const objectiveSchema = z.object({
  title: z.string().min(5).max(80),
  category: z.string(),
  cycle: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  wish: z.string().optional(),
  outcome: z.string().optional(),
  obstacle: z.string().optional(),
  plan: z.string().optional(),
  keyResults: z.array(krSchema).min(1).max(5),
});

// 列表
router.get('/', async (req: AuthRequest, res) => {
  const list = await prisma.objective.findMany({
    where: { userId: req.userId },
    include: { keyResults: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

// 详情
router.get('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.objective.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { keyResults: true, habits: true },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// 创建（包含 KR）
router.post('/', async (req: AuthRequest, res) => {
  const parsed = objectiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const created = await prisma.objective.create({
    data: {
      userId: req.userId!,
      title: data.title,
      category: data.category,
      cycle: data.cycle,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      wish: data.wish,
      outcome: data.outcome,
      obstacle: data.obstacle,
      plan: data.plan,
      keyResults: {
        create: data.keyResults.map(kr => ({
          title: kr.title,
          metric: kr.metric,
          startValue: kr.startValue,
          targetValue: kr.targetValue,
          currentValue: kr.currentValue,
          dueDate: new Date(kr.dueDate),
        })),
      },
    },
    include: { keyResults: true },
  });
  res.json(created);
});

// 更新 KR 当前值（进度）
router.patch('/kr/:krId', async (req: AuthRequest, res) => {
  const { currentValue } = req.body as { currentValue: number };
  // 校验归属
  const kr = await prisma.keyResult.findFirst({
    where: { id: req.params.krId, objective: { userId: req.userId } },
  });
  if (!kr) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.keyResult.update({
    where: { id: kr.id },
    data: { currentValue: Number(currentValue) },
  });
  res.json(updated);
});

// 归档 / 删除
router.patch('/:id/archive', async (req: AuthRequest, res) => {
  const obj = await prisma.objective.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!obj) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.objective.update({
    where: { id: obj.id },
    data: { status: 'archived' },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const obj = await prisma.objective.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!obj) return res.status(404).json({ error: 'Not found' });
  await prisma.objective.delete({ where: { id: obj.id } });
  res.json({ ok: true });
});

export default router;
