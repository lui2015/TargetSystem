import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Habit, Objective, Task } from '../types';
import { useAuth } from '../store/auth';

const greetings = [
  '今天也是值得认真对待的一天。',
  '稳定胜于爆发，坚持创造奇迹。',
  '每一次打卡，都是在为未来的自己投票。',
  '小进步，大变化。',
];

type TabKey = 'habits' | 'tasks';
const TAB_STORAGE_KEY = 'today.activeTab';

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Today() {
  const user = useAuth(s => s.user);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newKR, setNewKR] = useState<string>(''); // keyResultId
  const [newDue, setNewDue] = useState<string>(todayISO());
  const [loading, setLoading] = useState(true);
  const [tip] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'habits';
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    return v === 'tasks' ? 'tasks' : 'habits';
  });

  function switchTab(next: TabKey) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [hs, ts, os] = await Promise.all([
        api.get<Habit[]>('/habits'),
        api.get<Task[]>('/tasks/today'),
        api.get<Objective[]>('/objectives'),
      ]);
      // 今日 Tab 仅展示日计划习惯；周/月/年计划在习惯页查看
      setHabits(hs.filter(h => (h.cadence ?? 'daily') === 'daily'));
      setTasks(ts);
      setObjectives(os.filter(o => o.status === 'active'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 用 keyResultId 反查 OKR/KR 标签，给任务列表显示用
  const krIndex = useMemo(() => {
    const map = new Map<string, { krTitle: string; oTitle: string }>();
    objectives.forEach(o => {
      o.keyResults?.forEach(k => {
        map.set(k.id, { krTitle: k.title, oTitle: o.title });
      });
    });
    return map;
  }, [objectives]);

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
    await api.post('/tasks', {
      title: newTask.trim(),
      keyResultId: newKR || null,
      dueDate: newDue || todayISO(),
    });
    setNewTask('');
    setNewKR('');
    setNewDue(todayISO());
    load();
  }

  const date = new Date();
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  const completedHabits = habits.filter(h => h.checkedToday).length;
  const completedTasks = tasks.filter(t => t.done).length;

  const today = todayISO();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="text-xs md:text-sm text-subtle">{dateStr} · 周{weekday}</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1 text-default font-display">
          早上好，<span className="neon-text">{user?.name}</span> 👋
        </h1>
        <div className="text-sm md:text-base text-muted mt-2">{tip}</div>
      </div>

      {/* 今日概览（移动端三列紧凑） */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
        <Stat label="习惯打卡" value={`${completedHabits} / ${habits.length}`} tone="accent" />
        <Stat label="任务完成" value={`${completedTasks} / ${tasks.length}`} tone="success" />
        <Stat
          label="最长连续"
          value={habits.length ? `${Math.max(0, ...habits.map(h => h.streak))} 天` : '—'}
          tone="warning"
        />
      </div>

      {/* Tab 切换：移动端占满宽度 */}
      <div
        className="flex rounded-[var(--radius)] bg-surface-2 p-1 mb-4 w-full md:max-w-sm"
        role="tablist"
        aria-label="今日内容"
      >
        <TabButton
          active={tab === 'habits'}
          onClick={() => switchTab('habits')}
          label="习惯"
          count={`${completedHabits}/${habits.length}`}
        />
        <TabButton
          active={tab === 'tasks'}
          onClick={() => switchTab('tasks')}
          label="任务"
          count={`${completedTasks}/${tasks.length}`}
        />
      </div>

      {tab === 'habits' && (
        <section className="card" role="tabpanel" aria-label="今日习惯">
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
      )}

      {tab === 'tasks' && (
        <section className="card" role="tabpanel" aria-label="今日任务">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-default">今日任务</h2>
            <span className="text-xs text-subtle">{completedTasks}/{tasks.length}</span>
          </div>

          {/* 添加任务表单 */}
          <div className="p-3 mb-3 rounded-[var(--radius)] border border-border bg-surface-2/40">
            <input
              className="input mb-2"
              placeholder="+ 添加一个任务，按 Enter 提交"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
              <select
                className="input"
                value={newKR}
                onChange={e => setNewKR(e.target.value)}
                aria-label="关联 OKR / KR"
              >
                <option value="">不关联 OKR（独立任务）</option>
                {objectives.map(o => (
                  <optgroup
                    key={o.id}
                    label={`${o.cycle === 'year' ? '🗓️ 年度' : '📅 月度'}｜${o.title}`}
                  >
                    {(o.keyResults ?? []).map(k => (
                      <option key={k.id} value={k.id}>
                        {k.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                className="input"
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                aria-label="计划完成日期"
              />
              <button className="btn-primary" onClick={addTask}>
                添加
              </button>
            </div>
            {objectives.length === 0 && (
              <div className="text-xs text-subtle mt-2">
                暂无进行中的 OKR，先去「目标」页建一个吧；任务可以独立存在。
              </div>
            )}
            {newDue && newDue !== today && (
              <div className="text-xs text-warning mt-2">
                计划日期为 {newDue}，添加后不会显示在「今日任务」里，可在任务页按日期查看。
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-subtle text-sm">加载中…</div>
          ) : tasks.length === 0 ? (
            <Empty text="今天暂无任务，先打卡几个习惯？" />
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => {
                const linked = t.keyResultId ? krIndex.get(t.keyResultId) : null;
                const isFutureOrPast = !!t.dueDate && t.dueDate !== today;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius)] hover:bg-surface-2 cursor-pointer"
                    onClick={() => toggleTask(t)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        t.done
                          ? 'bg-accent border-accent text-accent-fg'
                          : 'border-border'
                      }`}
                    >
                      {t.done ? '✓' : ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-default ${t.done ? 'line-through opacity-60' : ''}`}
                      >
                        {t.title}
                      </div>
                      {(linked || isFutureOrPast) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {linked && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                              🎯 {linked.oTitle} · {linked.krTitle}
                            </span>
                          )}
                          {isFutureOrPast && (
                            <span className="px-1.5 py-0.5 rounded-full bg-surface-2 text-subtle border border-border">
                              📅 {t.dueDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] transition flex items-center justify-center gap-2 ${
        active ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted hover:text-default'
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-accent/15 text-accent' : 'bg-surface text-subtle'
        }`}
      >
        {count}
      </span>
    </button>
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
    <div className={`rounded-[var(--radius)] p-3 md:p-4 border ${toneMap[tone]}`}>
      <div className="text-[11px] md:text-xs font-medium opacity-80 leading-tight">{label}</div>
      <div className="text-lg md:text-2xl font-bold mt-1 font-display leading-tight">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-subtle py-6 text-center">{text}</div>;
}
