import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Habit, Objective } from '../types';
import HabitHeatmap from '../components/HabitHeatmap';

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);

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

      {habits.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🔁</div>
          <div className="text-lg font-medium mb-2 text-default">创建你的第一个习惯</div>
          <div className="text-muted mb-6">
            记住原子习惯原则：把行动降到不可能失败的最小单位。
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>立即创建</button>
        </div>
      ) : (
        <div className="space-y-5">
          {habits.map(h => (
            <div key={h.id} className="card">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-[var(--radius)] flex items-center justify-center text-2xl"
                  style={{ background: `${h.color}22` }}
                >
                  {h.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-default">{h.name}</div>
                  <div className="text-xs text-subtle">
                    {freqLabel(h.frequencyType, h.frequencyValue)} · 目标 {h.targetValue} {h.unit} · 难度{' '}
                    {diffLabel(h.difficulty)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent font-display">{h.streak}</div>
                  <div className="text-xs text-subtle">连续天数</div>
                </div>
                <button className="btn-ghost text-danger" onClick={() => del(h)}>删除</button>
              </div>
              <HabitHeatmap checkIns={h.recentCheckIns.map(c => c.checkDate)} color={h.color} />
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <HabitFormModal
          objectives={objectives}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function freqLabel(t: string, v: string) {
  if (t === 'daily') return '每天';
  if (t === 'weekly_n') return `每周 ${v || 'N'} 次`;
  if (t === 'specific_days') return `指定：${v}`;
  return t;
}
function diffLabel(d: string) {
  return { easy: '简单', medium: '中等', hard: '困难' }[d] || d;
}

function HabitFormModal({
  objectives,
  onClose,
  onCreated,
}: {
  objectives: Objective[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [color, setColor] = useState('#6366f1');
  const [objectiveId, setObjectiveId] = useState('');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly_n' | 'specific_days'>('daily');
  const [frequencyValue, setFrequencyValue] = useState('');
  const [targetValue, setTargetValue] = useState(1);
  const [unit, setUnit] = useState('次');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [stackAfter, setStackAfter] = useState('');
  const [reward, setReward] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return alert('请填写名称');
    setSubmitting(true);
    try {
      await api.post('/habits', {
        name,
        icon,
        color,
        objectiveId: objectiveId || null,
        frequencyType,
        frequencyValue,
        type: 'bool',
        targetValue: Number(targetValue),
        unit,
        difficulty,
        stackAfter: stackAfter || null,
        reward: reward || null,
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
          <div>
            <label className="label">关联目标（推荐）</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">频率</label>
              <select
                className="input"
                value={frequencyType}
                onChange={e => setFrequencyType(e.target.value as any)}
              >
                <option value="daily">每天</option>
                <option value="weekly_n">每周 N 次</option>
                <option value="specific_days">指定星期</option>
              </select>
            </div>
            <div>
              <label className="label">频率值</label>
              <input
                className="input"
                placeholder={frequencyType === 'weekly_n' ? '例如 3' : 'MON,WED,FRI'}
                value={frequencyValue}
                onChange={e => setFrequencyValue(e.target.value)}
                disabled={frequencyType === 'daily'}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">目标数值</label>
              <input
                type="number"
                className="input"
                value={targetValue}
                onChange={e => setTargetValue(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">单位</label>
              <input className="input" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
            <div>
              <label className="label">难度</label>
              <select
                className="input"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
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
