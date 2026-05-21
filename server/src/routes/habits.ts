import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';
import { formatDate, isScheduledDay } from '../utils/date';

const router = Router();
router.use(authMiddleware);

const habitSchema = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().optional(),
  color: z.string().optional(),
  objectiveId: z.string().nullable().optional(),
  frequencyType: z.enum(['daily', 'weekly_n', 'specific_days']).default('daily'),
  frequencyValue: z.string().default(''),
  type: z.enum(['bool', 'count', 'timer']).default('bool'),
  targetValue: z.number().default(1),
  unit: z.string().default('次'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  reminderTime: z.string().nullable().optional(),
  stackAfter: z.string().nullable().optional(),
  reward: z.string().nullable().optional(),
  // 分类与计划周期
  category: z.string().min(1).max(40).default('基础认知'),
  kind: z.enum(['学习', '实践']).default('实践'),
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
  cadence: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
  note: z.string().nullable().optional(),
});

// 列表（含本周打卡状态）
router.get('/', async (req: AuthRequest, res) => {
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  // 取近 90 天打卡用于统计
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const checkIns = await prisma.checkIn.findMany({
    where: { userId: req.userId, createdAt: { gte: since } },
  });

  const result = habits.map(h => {
    const hCheckIns = checkIns
      .filter(c => c.habitId === h.id)
      .sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1));

    // 计算当前 Streak
    let streak = 0;
    const today = new Date();
    const cursor = new Date(today);
    for (let i = 0; i < 365; i++) {
      const ds = formatDate(cursor);
      const scheduled = isScheduledDay(ds, h.frequencyType, h.frequencyValue);
      if (!scheduled) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      const hit = hCheckIns.find(c => c.checkDate === ds);
      if (hit) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        // 今天可以还没打：允许首日缺失不断
        if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const todayStr = formatDate(new Date());
    const checkedToday = hCheckIns.some(c => c.checkDate === todayStr);

    return {
      ...h,
      streak,
      checkedToday,
      recentCheckIns: hCheckIns.slice(0, 90),
    };
  });

  res.json(result);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  // 如传入 objectiveId，校验归属
  if (data.objectiveId) {
    const obj = await prisma.objective.findFirst({
      where: { id: data.objectiveId, userId: req.userId },
    });
    if (!obj) return res.status(400).json({ error: 'Invalid objectiveId' });
  }

  const created = await prisma.habit.create({
    data: {
      userId: req.userId!,
      name: data.name,
      icon: data.icon ?? '⭐',
      color: data.color ?? '#6366f1',
      objectiveId: data.objectiveId ?? null,
      frequencyType: data.frequencyType,
      frequencyValue: data.frequencyValue,
      type: data.type,
      targetValue: data.targetValue,
      unit: data.unit,
      difficulty: data.difficulty,
      reminderTime: data.reminderTime ?? null,
      stackAfter: data.stackAfter ?? null,
      reward: data.reward ?? null,
      category: data.category,
      kind: data.kind,
      priority: data.priority,
      cadence: data.cadence,
      note: data.note ?? null,
    },
  });
  res.json(created);
});

// PATCH：仅允许更新白名单字段，防止越权修改 userId / id 等
const habitPatchSchema = habitSchema.partial();
router.patch('/:id', async (req: AuthRequest, res) => {
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!habit) return res.status(404).json({ error: 'Not found' });
  const parsed = habitPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  // 校验 objectiveId 归属
  if (data.objectiveId) {
    const obj = await prisma.objective.findFirst({
      where: { id: data.objectiveId, userId: req.userId },
    });
    if (!obj) return res.status(400).json({ error: 'Invalid objectiveId' });
  }
  const updated = await prisma.habit.update({
    where: { id: habit.id },
    data,
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!habit) return res.status(404).json({ error: 'Not found' });
  await prisma.habit.update({
    where: { id: habit.id },
    data: { archivedAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
