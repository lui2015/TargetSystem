import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Habit, Objective } from '../types';
import HabitHeatmap from '../components/HabitHeatmap';
import HabitCalendarModal from '../components/HabitCalendarModal';

type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';
const CADENCE_TABS: { key: Cadence; label: string }[] = [
  { key: 'daily', label: '日计划' },
  { key: 'weekly', label: '周计划' },
  { key: 'monthly', label: '月计划' },
  { key: 'yearly', label: '年计划' },
];
const CADENCE_STORAGE_KEY = 'habits.activeCadence';
const ALL_CATEGORY = '__all__';
const PRIORITY_OPTIONS = ['P0', 'P1', 'P2'] as const;
const KIND_OPTIONS = ['学习', '实践'] as const;
const PRIORITY_TONE: Record<string, string> = {
  P0: 'bg-danger/15 text-danger border-danger/30',
  P1: 'bg-warning/15 text-warning border-warning/30',
  P2: 'bg-accent/15 text-accent border-accent/30',
};
const KIND_TONE: Record<string, string> = {
  学习: 'bg-accent/15 text-accent border-accent/30',
  实践: 'bg-success/15 text-success border-success/30',
};
// 常用分类（也支持自定义输入）
const CATEGORY_PRESETS = ['基础认知', '互联网项目管理', '金融投资'];

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [calendarHabit, setCalendarHabit] = useState<Habit | null>(null);
  const [cadence, setCadence] = useState<Cadence>(() => {
    if (typeof window === 'undefined') return 'daily';
    const v = window.localStorage.getItem(CADENCE_STORAGE_KEY) as Cadence | null;
    return v && CADENCE_TABS.some(t => t.key === v) ? v : 'daily';
  });
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORY);

  function switchCadence(c: Cadence) {
    setCadence(c);
    setCategoryFilter(ALL_CATEGORY);
    try {
      window.localStorage.setItem(CADENCE_STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    const [hs, os] = await Promise.all([
      api.get<Habit[]>('/habits'),
      api.get<Objective[]>('/objectives'),
    ]);
    setHabits(hs);
    setObjectives(os);
  }
  useEffect(() => {
    load();
  }, []);

  async function del(h: Habit) {
    if (!confirm(`删除习惯"${h.name}"？历史打卡将被保留。`)) return;
    await api.del(`/habits/${h.id}`);
    load();
  }

  // 当前 Tab 下的习惯
  const habitsInCadence = useMemo(
    () => habits.filter(h => (h.cadence ?? 'daily') === cadence),
    [habits, cadence]
  );
  // 当前 Tab 下的所有分类（按出现顺序）
  const categoriesInCadence = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    habitsInCadence.forEach(h => {
      const c = h.category || '基础认知';
      if (!seen.has(c)) {
        seen.add(c);
        list.push(c);
      }
    });
    return list;
  }, [habitsInCadence]);
  // 经过分类筛选后的习惯
  const filteredHabits = useMemo(
    () =>
      categoryFilter === ALL_CATEGORY
        ? habitsInCadence
        : habitsInCadence.filter(h => (h.category || '基础认知') === categoryFilter),
    [habitsInCadence, categoryFilter]
  );
  // 按分类分组
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, Habit[]>();
    filteredHabits.forEach(h => {
      const c = h.category || '基础认知';
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(h);
    });
    // 同一分类内按优先级 P0 > P1 > P2 排序
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.priority || 'P1').localeCompare(b.priority || 'P1'));
    }
    return Array.from(groups.entries());
  }, [filteredHabits]);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-default font-display">我的习惯</h1>
          <div className="text-muted mt-1">原子化 · 连续打卡 · 看见进步。</div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + 新建习惯
        </button>
      </div>

      {/* Cadence Tabs */}
      <div
        className="flex rounded-[var(--radius)] bg-surface-2 p-1 mb-4 w-full max-w-xl"
        role="tablist"
        aria-label="计划周期"
      >
        {CADENCE_TABS.map(t => {
          const count = habits.filter(h => (h.cadence ?? 'daily') === t.key).length;
          const active = cadence === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchCadence(t.key)}
              className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] transition flex items-center justify-center gap-2 ${
                active ? 'bg-surface shadow-sm font-medium text-default' : 'text-muted hover:text-default'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-accent/15 text-accent' : 'bg-surface text-subtle'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 分类筛选 chips */}
      {categoriesInCadence.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <CategoryChip
            active={categoryFilter === ALL_CATEGORY}
            onClick={() => setCategoryFilter(ALL_CATEGORY)}
            label={`全部 ${habitsInCadence.length}`}
          />
          {categoriesInCadence.map(c => (
            <CategoryChip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
              label={`${c} ${habitsInCadence.filter(h => (h.category || '基础认知') === c).length}`}
            />
          ))}
        </div>
      )}

      {filteredHabits.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🔁</div>
          <div className="text-lg font-medium mb-2 text-default">
            {habits.length === 0 ? '创建你的第一个习惯' : '此周期下暂无习惯'}
          </div>
          <div className="text-muted mb-6">
            记住原子习惯原则：把行动降到不可能失败的最小单位。
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>立即创建</button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByCategory.map(([cat, list]) => (
            <section key={cat}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-base font-semibold text-default">{cat}</h2>
                <span className="text-xs text-subtle">{list.length} 个习惯</span>
              </div>
              <div className="space-y-4">
                {list.map(h => (
                  <div key={h.id} className="card">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div
                        className="w-11 h-11 rounded-[var(--radius)] flex items-center justify-center text-2xl shrink-0"
                        style={{ background: `${h.color}22` }}
                      >
                        {h.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-default">{h.name}</div>
                          <Badge tone={PRIORITY_TONE[h.priority] || PRIORITY_TONE.P1}>
                            {h.priority || 'P1'}
                          </Badge>
                          <Badge tone={KIND_TONE[h.kind] || KIND_TONE.实践}>
                            {h.kind || '实践'}
                          </Badge>
                        </div>
                        {h.note && (
                          <div className="text-xs text-muted mt-1 truncate" title={h.note}>
                            📝 {h.note}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent font-display">{h.streak}</div>
                        <div className="text-xs text-subtle">连续天数</div>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => setCalendarHabit(h)}
                        title="查看打卡日历 / 补卡"
                      >
                        📅 日历
                      </button>
                      <button className="btn-ghost text-danger" onClick={() => del(h)}>
                        删除
                      </button>
                    </div>
                    <HabitHeatmap
                      checkIns={h.recentCheckIns.map(c => c.checkDate)}
                      color={h.color}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <HabitFormModal
          objectives={objectives}
          existingCategories={Array.from(
            new Set([...CATEGORY_PRESETS, ...habits.map(h => h.category || '基础认知')])
          )}
          defaultCadence={cadence}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {calendarHabit && (
        <HabitCalendarModal
          habit={calendarHabit}
          onClose={() => setCalendarHabit(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? 'bg-accent text-accent-fg border-accent'
          : 'bg-surface text-muted border-border hover:text-default hover:border-accent/40'
      }`}
    >
      {label}
    </button>
  );
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${tone}`}>
      {children}
    </span>
  );
}

function HabitFormModal({
  objectives,
  existingCategories,
  defaultCadence,
  onClose,
  onCreated,
}: {
  objectives: Objective[];
  existingCategories: string[];
  defaultCadence: Cadence;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [color, setColor] = useState('#6366f1');
  const [objectiveId, setObjectiveId] = useState('');
  const [stackAfter, setStackAfter] = useState('');
  const [reward, setReward] = useState('');
  const [category, setCategory] = useState(existingCategories[0] || '基础认知');
  const [kind, setKind] = useState<'学习' | '实践'>('实践');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [cadence, setCadence] = useState<Cadence>(defaultCadence);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return alert('请填写名称');
    if (!category.trim()) return alert('请填写或选择分类');
    setSubmitting(true);
    try {
      // 频率/目标数值/单位/难度 已从产品中下线，由后端取默认值
      await api.post('/habits', {
        name,
        icon,
        color,
        objectiveId: objectiveId || null,
        stackAfter: stackAfter || null,
        reward: reward || null,
        category: category.trim(),
        kind,
        priority,
        cadence,
        note: note.trim() || null,
      });
      onCreated();
    } catch (e: any) {
      alert(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[var(--radius)] w-full max-w-lg max-h-[90vh] overflow-auto border border-border shadow-xl">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-default">新建习惯</h2>
          <button className="text-subtle hover:text-default" onClick={onClose}>✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">名称</label>
            <input
              className="input"
              placeholder="如：阅读 10 分钟"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">图标</label>
              <input className="input" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
            </div>
            <div>
              <label className="label">颜色</label>
              <input
                type="color"
                className="input h-10 p-1"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">计划周期</label>
              <select
                className="input"
                value={cadence}
                onChange={e => setCadence(e.target.value as Cadence)}
              >
                <option value="daily">日计划</option>
                <option value="weekly">周计划</option>
                <option value="monthly">月计划</option>
                <option value="yearly">年计划</option>
              </select>
            </div>
            <div>
              <label className="label">优先级</label>
              <select
                className="input"
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">分类</label>
              <input
                className="input"
                list="habit-category-presets"
                placeholder="如：基础认知"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
              <datalist id="habit-category-presets">
                {existingCategories.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">类型</label>
              <select
                className="input"
                value={kind}
                onChange={e => setKind(e.target.value as any)}
              >
                {KIND_OPTIONS.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">关联目标（可选）</label>
            <select
              className="input"
              value={objectiveId}
              onChange={e => setObjectiveId(e.target.value)}
            >
              <option value="">不关联</option>
              {objectives.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">备注 / 执行场景</label>
            <input
              className="input"
              placeholder="如：上班路上 · 百词斩15个单词"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div>
            <label className="label">习惯堆叠（在什么之后做？）</label>
            <input
              className="input"
              placeholder="如：刷完牙后立刻…"
              value={stackAfter}
              onChange={e => setStackAfter(e.target.value)}
            />
          </div>
          <div>
            <label className="label">奖励</label>
            <input
              className="input"
              placeholder="完成后给自己的小奖励"
              value={reward}
              onChange={e => setReward(e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? '保存中…' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
