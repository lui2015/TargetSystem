import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Habit, Task } from '../types';
import { useAuth } from '../store/auth';

const greetings = [
  '今天也是值得认真对待的一天。',
  '稳定胜于爆发，坚持创造奇迹。',
  '每一次打卡，都是在为未来的自己投票。',
  '小进步，大变化。',
];

export default function Today() {
  const user = useAuth(s => s.user);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [tip] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);

  async function load() {
    setLoading(true);
    try {
      const [hs, ts] = await Promise.all([
        api.get<Habit[]>('/habits'),
        api.get<Task[]>('/tasks/today'),
      ]);
      setHabits(hs);
      setTasks(ts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleCheckIn(h: Habit) {
    await api.post('/checkins/toggle', { habitId: h.id });
    load();
  }

  async function toggleTask(t: Task) {
    await api.patch(`/tasks/${t.id}`, { done: !t.done });
    load();
  }

  async function addTask() {
    if (!newTask.trim()) return;
    await api.post('/tasks', { title: newTask.trim() });
    setNewTask('');
    load();
  }

  const date = new Date();
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  const completedHabits = habits.filter(h => h.checkedToday).length;
  const completedTasks = tasks.filter(t => t.done).length;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <div className="text-sm text-subtle">{dateStr} · 周{weekday}</div>
        <h1 className="text-3xl font-bold mt-1 text-default font-display">
          早上好，<span className="neon-text">{user?.name}</span> 👋
        </h1>
        <div className="text-muted mt-2">{tip}</div>
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="习惯打卡" value={`${completedHabits} / ${habits.length}`} tone="accent" />
        <Stat label="任务完成" value={`${completedTasks} / ${tasks.length}`} tone="success" />
        <Stat
          label="最长连续"
          value={habits.length ? `${Math.max(0, ...habits.map(h => h.streak))} 天` : '—'}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 习惯 */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-default">今日习惯</h2>
            <span className="text-xs text-subtle">{completedHabits}/{habits.length}</span>
          </div>
          {loading ? (
            <div className="text-subtle text-sm">加载中…</div>
          ) : habits.length === 0 ? (
            <Empty text="还没有习惯，去「习惯」页创建一个吧。" />
          ) : (
            <ul className="space-y-2">
              {habits.map(h => (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius)] border transition cursor-pointer ${
                    h.checkedToday
                      ? 'bg-success/10 border-success/40'
                      : 'bg-surface border-border hover:bg-surface-2'
                  }`}
                  onClick={() => toggleCheckIn(h)}
                >
                  <div
                    className="w-10 h-10 rounded-[var(--radius)] flex items-center justify-center text-xl"
                    style={{ background: `${h.color}22` }}
                  >
                    {h.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-default ${h.checkedToday ? 'line-through opacity-60' : ''}`}>
                      {h.name}
                    </div>
                    <div className="text-xs text-subtle">
                      连续 {h.streak} 天 · 目标 {h.targetValue} {h.unit}
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      h.checkedToday
                        ? 'bg-success border-success text-white'
                        : 'border-border'
                    }`}
                  >
                    {h.checkedToday ? '✓' : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 任务 */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-default">今日任务</h2>
            <span className="text-xs text-subtle">{completedTasks}/{tasks.length}</span>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              className="input"
              placeholder="+ 添加一个任务"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <button className="btn-primary" onClick={addTask}>添加</button>
          </div>
          {tasks.length === 0 ? (
            <Empty text="今天暂无任务，先打卡几个习惯？" />
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius)] hover:bg-surface-2 cursor-pointer"
                  onClick={() => toggleTask(t)}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      t.done
                        ? 'bg-accent border-accent text-accent-fg'
                        : 'border-border'
                    }`}
                  >
                    {t.done ? '✓' : ''}
                  </div>
                  <div className={`flex-1 text-default ${t.done ? 'line-through opacity-60' : ''}`}>
                    {t.title}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'success' | 'warning';
}) {
  const toneMap = {
    accent: 'bg-accent/10 text-accent border-accent/30',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
  } as const;
  return (
    <div className={`rounded-[var(--radius)] p-4 border ${toneMap[tone]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1 font-display">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-subtle py-6 text-center">{text}</div>;
}
