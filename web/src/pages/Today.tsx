import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';
const CADENCE_TABS: { key: Cadence; label: string }[] = [
  { key: 'daily', label: '每日' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'yearly', label: '每年' },
];
const CADENCE_STORAGE_KEY = 'today.habitCadence';
// 不同周期下"已坚持"的计量单位
const CADENCE_UNIT: Record<Cadence, string> = {
  daily: '天',
  weekly: '周',
  monthly: '月',
  yearly: '年',
};

type Horizon = 'short' | 'mid' | 'long';
const HORIZON_TABS: { key: Horizon; label: string; hint: string }[] = [
  { key: 'short', label: '短期', hint: '本周内' },
  { key: 'mid', label: '中期', hint: '本月内' },
  { key: 'long', label: '长期', hint: '本月之后 / 无日期' },
];
const HORIZON_STORAGE_KEY = 'today.taskHorizon';

/** 取本周日 23:59:59（周一为一周第一天，周日为最后一天） */
function endOfThisWeek(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  // getDay: 周日=0 ... 周六=6；以周日为本周末
  const offsetToSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + offsetToSunday);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 取本月最后一天 23:59:59 */
function endOfThisMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** 按 dueDate 把任务分到 短期 / 中期 / 长期 */
function classifyTask(t: Task, now: Date): Horizon {
  // 无截止日期或非法 → 长期
  if (!t.dueDate) return 'long';
  const due = new Date(t.dueDate + 'T00:00:00');
  if (Number.isNaN(due.getTime())) return 'long';

  // 已逾期且未完成 → 短期（更紧迫）
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!t.done && due < todayMid) return 'short';

  if (due <= endOfThisWeek(now)) return 'short';
  if (due <= endOfThisMonth(now)) return 'mid';
  return 'long';
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Today() {
  const user = useAuth(s => s.user);
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newKR, setNewKR] = useState<string>(''); // keyResultId
  const [newDue, setNewDue] = useState<string>(todayISO());
  const [showAddTask, setShowAddTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tip] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'habits';
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    return v === 'tasks' ? 'tasks' : 'habits';
  });
  const [cadence, setCadence] = useState<Cadence>(() => {
    if (typeof window === 'undefined') return 'daily';
    const v = window.localStorage.getItem(CADENCE_STORAGE_KEY) as Cadence | null;
    return v && CADENCE_TABS.some(t => t.key === v) ? v : 'daily';
  });
  const [horizon, setHorizon] = useState<Horizon>(() => {
    if (typeof window === 'undefined') return 'short';
    const v = window.localStorage.getItem(HORIZON_STORAGE_KEY) as Horizon | null;
    return v && HORIZON_TABS.some(t => t.key === v) ? v : 'short';
  });

  function switchTab(next: TabKey) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function switchCadence(next: Cadence) {
    setCadence(next);
    try {
      window.localStorage.setItem(CADENCE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function switchHorizon(next: Horizon) {
    setHorizon(next);
    try {
      window.localStorage.setItem(HORIZON_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [hs, ts, os] = await Promise.all([
        api.get<Habit[]>('/habits'),
        api.get<Task[]>('/tasks'),
        api.get<Objective[]>('/objectives'),
      ]);
      setHabits(hs);
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

  // 当前 cadence 下的习惯
  const habitsInCadence = useMemo(
    () => habits.filter(h => (h.cadence ?? 'daily') === cadence),
    [habits, cadence]
  );
  const completedHabits = habitsInCadence.filter(h => h.checkedToday).length;
  const maxTotal = habitsInCadence.length
    ? Math.max(0, ...habitsInCadence.map(h => h.totalCheckIns ?? 0))
    : 0;

  // 任务按短/中/长分组
  const taskGroups = useMemo(() => {
    const groups: Record<Horizon, Task[]> = { short: [], mid: [], long: [] };
    tasks.forEach(t => {
      groups[classifyTask(t, date)].push(t);
    });
    // 排序：未完成在前；同状态按 dueDate 升序，无日期最后
    (Object.keys(groups) as Horizon[]).forEach(k => {
      groups[k].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const ad = a.dueDate ?? '9999-12-31';
        const bd = b.dueDate ?? '9999-12-31';
        return ad.localeCompare(bd);
      });
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const tasksInHorizon = taskGroups[horizon];
  const completedTasksInHorizon = tasksInHorizon.filter(t => t.done).length;

  const today = todayISO();
  // 顶部「任务完成」概览仍以"今日到期"为准
  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === today), [tasks, today]);
  const completedTodayTasks = todayTasks.filter(t => t.done).length;

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
        <Stat label="习惯打卡" value={`${completedHabits} / ${habitsInCadence.length}`} tone="accent" />
        <Stat label="任务完成" value={`${completedTodayTasks} / ${todayTasks.length}`} tone="success" />
        <Stat
          label="累计最多"
          value={habitsInCadence.length ? `${maxTotal} ${CADENCE_UNIT[cadence]}` : '—'}
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
          count={`${completedHabits}/${habitsInCadence.length}`}
        />
        <TabButton
          active={tab === 'tasks'}
          onClick={() => switchTab('tasks')}
          label="任务"
          count={`${completedTasksInHorizon}/${tasksInHorizon.length}`}
        />
      </div>

      {tab === 'habits' && (
        <section className="card" role="tabpanel" aria-label="今日习惯">
          {/* 二级：周期筛选 + 添加习惯入口 */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap md:flex-nowrap">
            <div
              className="flex rounded-[var(--radius)] bg-surface-2 p-1 w-full md:max-w-md"
              role="tablist"
              aria-label="计划周期"
            >
              {CADENCE_TABS.map(t => {
                const active = cadence === t.key;
                const count = habits.filter(h => (h.cadence ?? 'daily') === t.key).length;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchCadence(t.key)}
                    className={`flex-1 py-1.5 px-2 text-xs md:text-sm rounded-[var(--radius)] transition flex items-center justify-center gap-1.5 ${
                      active ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted hover:text-default'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-accent/15 text-accent' : 'bg-surface text-subtle'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => navigate('/habits')}
              title="去习惯页添加新习惯"
              className="text-xs px-2.5 py-1 rounded-[var(--radius)] border border-border bg-surface-2 hover:bg-surface text-default transition flex items-center gap-1 shrink-0"
            >
              <span>+</span>
              <span>添加习惯</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-default">
              {CADENCE_TABS.find(t => t.key === cadence)?.label}习惯
            </h2>
            <span className="text-xs text-subtle">{completedHabits}/{habitsInCadence.length}</span>
          </div>
          {loading ? (
            <div className="text-subtle text-sm">加载中…</div>
          ) : habitsInCadence.length === 0 ? (
            <Empty
              text={
                habits.length === 0
                  ? '还没有习惯，去「习惯」页创建一个吧。'
                  : `暂无${CADENCE_TABS.find(t => t.key === cadence)?.label}习惯，可在「习惯」页新建。`
              }
            />
          ) : (
            <ul className="space-y-2">
              {habitsInCadence.map(h => (
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
                      已坚持 {h.totalCheckIns ?? 0} {CADENCE_UNIT[(h.cadence as Cadence) || 'daily']}
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
        <section className="card" role="tabpanel" aria-label="任务">
          {/* 二级：短期 / 中期 / 长期 */}
          <div
            className="flex rounded-[var(--radius)] bg-surface-2 p-1 mb-4 w-full md:max-w-md"
            role="tablist"
            aria-label="任务时间范围"
          >
            {HORIZON_TABS.map(t => {
              const active = horizon === t.key;
              const count = taskGroups[t.key].length;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={t.hint}
                  onClick={() => switchHorizon(t.key)}
                  className={`flex-1 py-1.5 px-2 text-xs md:text-sm rounded-[var(--radius)] transition flex items-center justify-center gap-1.5 ${
                    active ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted hover:text-default'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-accent/15 text-accent' : 'bg-surface text-subtle'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-default">
              {HORIZON_TABS.find(t => t.key === horizon)?.label}任务
              <span className="ml-2 text-xs font-normal text-subtle">
                {HORIZON_TABS.find(t => t.key === horizon)?.hint}
              </span>
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-subtle">{completedTasksInHorizon}/{tasksInHorizon.length}</span>
              <button
                type="button"
                onClick={() => setShowAddTask(v => !v)}
                aria-expanded={showAddTask}
                aria-controls="task-add-panel"
                className="text-xs px-2.5 py-1 rounded-[var(--radius)] border border-border bg-surface-2 hover:bg-surface text-default transition flex items-center gap-1"
              >
                <span className={`inline-block transition-transform ${showAddTask ? 'rotate-45' : ''}`}>+</span>
                <span>{showAddTask ? '收起' : '添加任务'}</span>
              </button>
            </div>
          </div>

          {/* 添加任务表单（可折叠） */}
          {showAddTask && (
            <div
              id="task-add-panel"
              className="p-3 mb-3 rounded-[var(--radius)] border border-border bg-surface-2/40"
            >
              <input
                className="input mb-2"
                placeholder="+ 添加一个任务，按 Enter 提交"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                autoFocus
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
          )}

          {loading ? (
            <div className="text-subtle text-sm">加载中…</div>
          ) : tasksInHorizon.length === 0 ? (
            <Empty
              text={
                tasks.length === 0
                  ? '还没有任务，添加一个吧。'
                  : `暂无${HORIZON_TABS.find(t => t.key === horizon)?.label}任务（${HORIZON_TABS.find(t => t.key === horizon)?.hint}）。`
              }
            />
          ) : (
            <ul className="space-y-2">
              {tasksInHorizon.map(t => {
                const linked = t.keyResultId ? krIndex.get(t.keyResultId) : null;
                const isOverdue = !!t.dueDate && !t.done && t.dueDate < today;
                const showDate = !!t.dueDate && t.dueDate !== today;
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
                      {(linked || showDate || isOverdue) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {linked && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                              🎯 {linked.oTitle} · {linked.krTitle}
                            </span>
                          )}
                          {showDate && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full border ${
                                isOverdue
                                  ? 'bg-danger/10 text-danger border-danger/30'
                                  : 'bg-surface-2 text-subtle border-border'
                              }`}
                            >
                              📅 {t.dueDate}{isOverdue ? ' · 已逾期' : ''}
                            </span>
                          )}
                          {!t.dueDate && (
                            <span className="px-1.5 py-0.5 rounded-full bg-surface-2 text-subtle border border-border">
                              📅 无日期
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
