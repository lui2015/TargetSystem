import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';
import { formatDate } from '../utils/date';

const router = Router();
router.use(authMiddleware);

const checkInSchema = z.object({
  habitId: z.string(),
  checkDate: z.string().optional(), // 默认今天
  value: z.number().default(1),
  mood: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  isMakeUp: z.boolean().default(false),
});

// 新建/切换打卡（幂等：已存在则取消打卡）
router.post('/toggle', async (req: AuthRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const checkDate = data.checkDate ?? formatDate(new Date());

  const habit = await prisma.habit.findFirst({
    where: { id: data.habitId, userId: req.userId },
  });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const existing = await prisma.checkIn.findUnique({
    where: { habitId_checkDate: { habitId: habit.id, checkDate } },
  });

  if (existing) {
    await prisma.checkIn.delete({ where: { id: existing.id } });
    return res.json({ ok: true, action: 'removed' });
  }

  const created = await prisma.checkIn.create({
    data: {
      userId: req.userId!,
      habitId: habit.id,
      checkDate,
      value: data.value,
      mood: data.mood ?? null,
      note: data.note ?? null,
      isMakeUp: data.isMakeUp,
    },
  });
  res.json({ ok: true, action: 'created', checkIn: created });
});

// 取习惯的打卡历史（用于热力图）
router.get('/habit/:habitId', async (req: AuthRequest, res) => {
  const habit = await prisma.habit.findFirst({
    where: { id: req.params.habitId, userId: req.userId },
  });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const list = await prisma.checkIn.findMany({
    where: { habitId: habit.id },
    orderBy: { checkDate: 'desc' },
    take: 365,
  });
  res.json(list);
});

export default router;
