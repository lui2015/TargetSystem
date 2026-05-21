import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();
router.use(authMiddleware);

const krSchema = z.object({
  id: z.string().optional(), // 编辑时若已有 id 则更新，否则视为新增
  title: z.string().min(1),
  metric: z.string().min(1).default('-'),
  startValue: z.number().default(0),
  targetValue: z.number().positive().default(1),
  currentValue: z.number().default(0),
  dueDate: z.string().optional(), // ISO；不传则用 Objective.endDate
});

const objectiveSchema = z.object({
  title: z.string().min(5).max(80),
  category: z.string(),
  cycle: z.enum(['year', 'month']),
  startDate: z.string(),
  endDate: z.string(),
  parentObjectiveId: z.string().nullish(),
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
    include: {
      keyResults: true,
      parent: { select: { id: true, title: true, cycle: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

// 详情
router.get('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.objective.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      keyResults: true,
      habits: true,
      parent: { select: { id: true, title: true, cycle: true } },
      children: {
        select: { id: true, title: true, cycle: true, status: true },
      },
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// 创建（包含 KR）
router.post('/', async (req: AuthRequest, res) => {
  const parsed = objectiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  // 校验 parentObjectiveId 归属（只有月度 OKR 才允许承接，且 parent 必须是同一用户的年度 OKR）
  let parentObjectiveId: string | null = null;
  if (data.parentObjectiveId) {
    if (data.cycle !== 'month') {
      return res.status(400).json({ error: '只有月度 OKR 才能承接年度 OKR' });
    }
    const parent = await prisma.objective.findFirst({
      where: {
        id: data.parentObjectiveId,
        userId: req.userId,
        cycle: 'year',
      },
    });
    if (!parent) return res.status(400).json({ error: '指定的年度 OKR 不存在' });
    parentObjectiveId = parent.id;
  }

  const created = await prisma.objective.create({
    data: {
      userId: req.userId!,
      title: data.title,
      category: data.category,
      cycle: data.cycle,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      parentObjectiveId,
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
          dueDate: new Date(kr.dueDate || data.endDate),
        })),
      },
    },
    include: { keyResults: true },
  });
  res.json(created);
});

// 编辑（O + KR）
router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = objectiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  // 校验目标归属
  const exists = await prisma.objective.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { keyResults: { select: { id: true } } },
  });
  if (!exists) return res.status(404).json({ error: 'Not found' });

  // 校验承接关系
  let parentObjectiveId: string | null = null;
  if (data.parentObjectiveId) {
    if (data.cycle !== 'month') {
      return res.status(400).json({ error: '只有月度 OKR 才能承接年度 OKR' });
    }
    if (data.parentObjectiveId === exists.id) {
      return res.status(400).json({ error: '不能承接自己' });
    }
    const parent = await prisma.objective.findFirst({
      where: {
        id: data.parentObjectiveId,
        userId: req.userId,
        cycle: 'year',
      },
    });
    if (!parent) return res.status(400).json({ error: '指定的年度 OKR 不存在' });
    parentObjectiveId = parent.id;
  }

  const existingKrIds = new Set(exists.keyResults.map(k => k.id));
  const incomingKrIds = new Set(
    data.keyResults.map(k => k.id).filter((x): x is string => !!x)
  );
  const toDelete = [...existingKrIds].filter(id => !incomingKrIds.has(id));

  await prisma.$transaction(async tx => {
    await tx.objective.update({
      where: { id: exists.id },
      data: {
        title: data.title,
        category: data.category,
        cycle: data.cycle,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        parentObjectiveId,
        wish: data.wish,
        outcome: data.outcome,
        obstacle: data.obstacle,
        plan: data.plan,
      },
    });

    if (toDelete.length > 0) {
      await tx.keyResult.deleteMany({
        where: { id: { in: toDelete }, objectiveId: exists.id },
      });
    }

    for (const kr of data.keyResults) {
      const due = new Date(kr.dueDate || data.endDate);
      if (kr.id && existingKrIds.has(kr.id)) {
        // 编辑场景：仅更新可由用户修改的字段（title/metric/targetValue/dueDate）；不改 currentValue
        await tx.keyResult.update({
          where: { id: kr.id },
          data: {
            title: kr.title,
            metric: kr.metric,
            startValue: kr.startValue,
            targetValue: kr.targetValue,
            dueDate: due,
          },
        });
      } else {
        await tx.keyResult.create({
          data: {
            objectiveId: exists.id,
            title: kr.title,
            metric: kr.metric,
            startValue: kr.startValue,
            targetValue: kr.targetValue,
            currentValue: kr.currentValue,
            dueDate: due,
          },
        });
      }
    }
  });

  const fresh = await prisma.objective.findFirst({
    where: { id: exists.id },
    include: {
      keyResults: true,
      parent: { select: { id: true, title: true, cycle: true } },
      children: { select: { id: true, title: true, cycle: true, status: true } },
    },
  });
  res.json(fresh);
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
