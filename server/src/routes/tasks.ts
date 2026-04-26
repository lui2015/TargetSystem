import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../auth';
import { formatDate } from '../utils/date';

const router = Router();
router.use(authMiddleware);

const taskSchema = z.object({
  title: z.string().min(1).max(120),
  keyResultId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { date } = req.query as { date?: string };
  const list = await prisma.task.findMany({
    where: {
      userId: req.userId,
      ...(date ? { dueDate: date } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

router.get('/today', async (req: AuthRequest, res) => {
  const today = formatDate(new Date());
  const list = await prisma.task.findMany({
    where: { userId: req.userId, dueDate: today },
    orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(list);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.keyResultId) {
    const kr = await prisma.keyResult.findFirst({
      where: { id: parsed.data.keyResultId, objective: { userId: req.userId } },
    });
    if (!kr) return res.status(400).json({ error: 'Invalid keyResultId' });
  }

  const created = await prisma.task.create({
    data: {
      userId: req.userId!,
      title: parsed.data.title,
      keyResultId: parsed.data.keyResultId ?? null,
      dueDate: parsed.data.dueDate ?? formatDate(new Date()),
    },
  });
  res.json(created);
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!task) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: req.body,
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!task) return res.status(404).json({ error: 'Not found' });
  await prisma.task.delete({ where: { id: task.id } });
  res.json({ ok: true });
});

export default router;
