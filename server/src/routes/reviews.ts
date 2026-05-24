import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';
import { formatDate, getISOWeekKey, getWeekRange } from '../utils/date';

const router = Router();
router.use(authMiddleware);

// 获取本周数据聚合（用于复盘页上方展示）
router.get('/weekly/summary', async (req: AuthRequest, res) => {
  const { start, end } = getWeekRange(new Date());
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  const habits = await prisma.habit.findMany({
    where: { userId: req.userId, archivedAt: null },
  });
  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId: req.userId,
      checkDate: { gte: startStr, lte: endStr },
    },
  });
  const tasks = await prisma.task.findMany({
    where: {
      userId: req.userId,
      dueDate: { gte: startStr, lte: endStr },
    },
  });

  // 累计维度：用户全部历史
  const allCheckIns = await prisma.checkIn.findMany({
    where: { userId: req.userId },
    select: { habitId: true, checkDate: true },
  });
  const allDoneTasksCount = await prisma.task.count({
    where: { userId: req.userId, done: true },
  });

  // 习惯完成率：已打卡次数 / (习惯数 * 7) 简化计算
  const expected = habits.length * 7;
  const habitCompletionRate = expected === 0 ? 0 : (checkIns.length / expected) * 100;

  const taskCompletionRate =
    tasks.length === 0 ? 0 : (tasks.filter(t => t.done).length / tasks.length) * 100;

  // 本周打卡的不重复习惯数
  const weeklyCheckedHabitIds = new Set(checkIns.map(c => c.habitId));
  // 累计打卡过的不重复习惯数
  const totalCheckedHabitIds = new Set(allCheckIns.map(c => c.habitId));
  // 坚持打卡天数：累计有过打卡的不重复日期数
  const totalCheckedDays = new Set(allCheckIns.map(c => c.checkDate)).size;

  res.json({
    periodKey: getISOWeekKey(),
    weekRange: { start: startStr, end: endStr },
    habitsCount: habits.length,
    checkInsCount: checkIns.length,
    habitCompletionRate: Math.round(habitCompletionRate),
    tasksCount: tasks.length,
    tasksDoneCount: tasks.filter(t => t.done).length,
    taskCompletionRate: Math.round(taskCompletionRate),
    // 新增统计
    weeklyCheckedHabitsCount: weeklyCheckedHabitIds.size,
    totalCheckedHabitsCount: totalCheckedHabitIds.size,
    totalCheckedDays,
    weeklyTasksDoneCount: tasks.filter(t => t.done).length,
    totalTasksDoneCount: allDoneTasksCount,
  });
});

const reviewSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  periodKey: z.string(),
  keep: z.string().optional(),
  problem: z.string().optional(),
  tryNext: z.string().optional(),
  summary: z.string().optional(), // JSON string
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const review = await prisma.review.upsert({
    where: {
      userId_type_periodKey: {
        userId: req.userId!,
        type: data.type,
        periodKey: data.periodKey,
      },
    },
    create: {
      userId: req.userId!,
      type: data.type,
      periodKey: data.periodKey,
      keep: data.keep,
      problem: data.problem,
      tryNext: data.tryNext,
      summary: data.summary,
    },
    update: {
      keep: data.keep,
      problem: data.problem,
      tryNext: data.tryNext,
      summary: data.summary,
    },
  });
  res.json(review);
});

router.get('/', async (req: AuthRequest, res) => {
  const list = await prisma.review.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(list);
});

router.get('/current/weekly', async (req: AuthRequest, res) => {
  const periodKey = getISOWeekKey();
  const r = await prisma.review.findUnique({
    where: {
      userId_type_periodKey: {
        userId: req.userId!,
        type: 'weekly',
        periodKey,
      },
    },
  });
  res.json(r);
});

export default router;
