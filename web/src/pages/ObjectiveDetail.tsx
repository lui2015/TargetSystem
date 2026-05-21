import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Objective, KeyResult } from '../types';

const categories = [
  { id: 'career', label: '💼 职业' },
  { id: 'study', label: '📚 学习' },
  { id: 'health', label: '💪 健康' },
  { id: 'finance', label: '💰 财务' },
  { id: 'relation', label: '❤️ 关系' },
  { id: 'hobby', label: '🎨 兴趣' },
  { id: 'other', label: '⭐ 其他' },
];

type EditableKR = {
  id?: string; // 已有 KR 才会有 id
  title: string;
};

export default function ObjectiveDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [obj, setObj] = useState<Objective | null>(null);

  // 编辑态
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('career');
  const [draftCycle, setDraftCycle] = useState<'year' | 'month'>('month');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftParent, setDraftParent] = useState<string>('');
  const [draftWish, setDraftWish] = useState('');
  const [draftOutcome, setDraftOutcome] = useState('');
  const [draftObstacle, setDraftObstacle] = useState('');
  const [draftPlan, setDraftPlan] = useState('');
  const [draftKRs, setDraftKRs] = useState<EditableKR[]>([]);
  const [yearlyOkrs, setYearlyOkrs] = useState<Objective[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const res = await api.get<Objective>(`/objectives/${id}`);
    setObj(res);
  }
  useEffect(() => {
    load();
  }, [id]);

  function enterEdit() {
    if (!obj) return;
    setDraftTitle(obj.title);
    setDraftCategory(obj.category);
    setDraftCycle((obj.cycle === 'year' ? 'year' : 'month') as 'year' | 'month');
    setDraftStart(toISODate(obj.startDate));
    setDraftEnd(toISODate(obj.endDate));
    setDraftParent(obj.parentObjectiveId || '');
    setDraftWish(obj.wish || '');
    setDraftOutcome(obj.outcome || '');
    setDraftObstacle(obj.obstacle || '');
    setDraftPlan(obj.plan || '');
    setDraftKRs(obj.keyResults.map(k => ({ id: k.id, title: k.title })));
    setErr('');
    setEditing(true);

    // 拉取年度 OKR 列表，供承接选择
    api
      .get<Objective[]>('/objectives')
      .then(list =>
        setYearlyOkrs(
          list.filter(o => o.cycle === 'year' && o.status === 'active' && o.id !== obj.id)
        )
      )
      .catch(() => setYearlyOkrs([]));
  }

  function cancelEdit() {
    setEditing(false);
    setErr('');
  }

  async function save() {
    if (!obj) return;
    if (draftTitle.trim().length < 5) return setErr('目标标题至少 5 个字');
    if (draftTitle.trim().length > 80) return setErr('目标标题最多 80 个字');
    if (draftKRs.length === 0) return setErr('至少保留一条 KR');
    for (const k of draftKRs) {
      if (!k.title.trim()) return setErr('KR 标题不能为空');
    }
    setSaving(true);
    setErr('');
    try {
      const updated = await api.put<Objective>(`/objectives/${obj.id}`, {
        title: draftTitle.trim(),
        category: draftCategory,
        cycle: draftCycle,
        startDate: draftStart,
        endDate: draftEnd,
        parentObjectiveId: draftCycle === 'month' && draftParent ? draftParent : null,
        wish: draftWish,
        outcome: draftOutcome,
        obstacle: draftObstacle,
        plan: draftPlan,
        keyResults: draftKRs.map(k => ({
          id: k.id,
          title: k.title.trim(),
          // 已下线字段，给默认占位
          metric: '-',
          startValue: 0,
          targetValue: 1,
          currentValue: 0,
        })),
      });
      setObj(updated);
      setEditing(false);
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function updateKRProgress(krId: string, percent: number) {
    // 现在 KR 没有"目标值"概念，统一以 0-100 表示进度（startValue=0, targetValue=100）
    const v = Math.max(0, Math.min(100, Math.round(percent)));
    await api.patch(`/objectives/kr/${krId}`, { currentValue: v });
    load();
  }

  async function archive() {
    if (!confirm('归档这个目标？归档后将从看板隐藏。')) return;
    await api.patch(`/objectives/${id}/archive`);
    nav('/objectives');
  }

  async function del() {
    if (!confirm('删除该目标及其所有 KR，此操作不可恢复。')) return;
    await api.del(`/objectives/${id}`);
    nav('/objectives');
  }

  const progress = useMemo(() => {
    if (!obj || obj.keyResults.length === 0) return 0;
    return Math.round(
      obj.keyResults.reduce((acc, kr) => acc + krProgress(kr), 0) / obj.keyResults.length
    );
  }, [obj]);

  if (!obj) return <div className="p-8 text-subtle">加载中…</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link to="/objectives" className="hover:text-accent">← 返回目标</Link>
      </div>

      {/* 顶部信息卡 */}
      <div className="card mb-6">
        {!editing ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-subtle mb-1">
                  {obj.category} · {cycleLabel(obj.cycle)}
                  {obj.parent && (
                    <>
                      {' '}·{' '}
                      <Link to={`/objectives/${obj.parent.id}`} className="text-accent hover:underline">
                        承接 🗓️ {obj.parent.title}
                      </Link>
                    </>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-default font-display">{obj.title}</h1>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={enterEdit}>编辑</button>
                <button className="btn-secondary" onClick={archive}>归档</button>
                <button className="btn-ghost text-danger" onClick={del}>删除</button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted mb-1">
                <span>整体进度</span>
                <span className="font-semibold text-accent">{progress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-default">✏️ 编辑目标</h2>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={cancelEdit} disabled={saving}>取消</button>
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">分类</label>
                <select
                  className="input"
                  value={draftCategory}
                  onChange={e => setDraftCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">周期</label>
                <select
                  className="input"
                  value={draftCycle}
                  onChange={e => {
                    const c = e.target.value as 'year' | 'month';
                    setDraftCycle(c);
                    if (c === 'year') setDraftParent('');
                  }}
                >
                  <option value="year">🗓️ 年度 OKR</option>
                  <option value="month">📅 月度 OKR</option>
                </select>
              </div>
            </div>

            {draftCycle === 'month' && (
              <div className="mb-3">
                <label className="label">承接的年度 OKR（可选）</label>
                <select
                  className="input"
                  value={draftParent}
                  onChange={e => setDraftParent(e.target.value)}
                >
                  <option value="">不承接，独立月度目标</option>
                  {yearlyOkrs.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="label">Objective</label>
              <textarea
                className="input h-24"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                maxLength={80}
              />
              <div className="text-right text-xs text-subtle mt-1">{draftTitle.length} / 80</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">开始日期</label>
                <input
                  className="input"
                  type="date"
                  value={draftStart}
                  onChange={e => setDraftStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label">结束日期</label>
                <input
                  className="input"
                  type="date"
                  value={draftEnd}
                  onChange={e => setDraftEnd(e.target.value)}
                />
              </div>
            </div>

            {/* KR 编辑 */}
            <div className="mb-4">
              <div className="label mb-2">Key Results</div>
              <div className="space-y-2">
                {draftKRs.map((kr, idx) => (
                  <div
                    key={kr.id ?? `new-${idx}`}
                    className="flex items-center gap-2 p-2 border border-border rounded-[var(--radius)] bg-surface-2/40"
                  >
                    <span className="text-xs text-subtle w-10 shrink-0">KR {idx + 1}</span>
                    <input
                      className="input flex-1"
                      placeholder="关键结果，如：完成 30 次 5 公里跑步"
                      value={kr.title}
                      onChange={e =>
                        setDraftKRs(list =>
                          list.map((k, i) => (i === idx ? { ...k, title: e.target.value } : k))
                        )
                      }
                    />
                    {draftKRs.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-danger px-2"
                        onClick={() => setDraftKRs(list => list.filter((_, i) => i !== idx))}
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
                {draftKRs.length < 5 && (
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => setDraftKRs(list => [...list, { title: '' }])}
                  >
                    + 添加 KR
                  </button>
                )}
              </div>
            </div>

            {/* WOOP */}
            <div className="grid grid-cols-2 gap-3">
              <WoopEdit label="W · Wish 愿望" value={draftWish} setValue={setDraftWish} />
              <WoopEdit label="O · Outcome 最佳结果" value={draftOutcome} setValue={setDraftOutcome} />
              <WoopEdit label="O · Obstacle 最大障碍" value={draftObstacle} setValue={setDraftObstacle} />
              <WoopEdit label="P · Plan If-Then 应对" value={draftPlan} setValue={setDraftPlan} />
            </div>

            {err && <div className="mt-3 text-sm text-danger">{err}</div>}
          </div>
        )}
      </div>

      {/* 被承接的月度 OKR */}
      {!editing && obj.children && obj.children.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3 text-default">📅 承接此目标的月度 OKR</h2>
          <div className="space-y-2">
            {obj.children.map(c => (
              <Link
                key={c.id}
                to={`/objectives/${c.id}`}
                className="flex items-center justify-between p-3 rounded-[var(--radius)] bg-surface-2/40 hover:bg-surface-2 transition"
              >
                <span className="text-sm text-default truncate">{c.title}</span>
                <span className="text-xs text-subtle ml-3 shrink-0">
                  {cycleLabel(c.cycle)} · {c.status === 'archived' ? '已归档' : '进行中'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* WOOP（只读） */}
      {!editing && (obj.wish || obj.outcome || obj.obstacle || obj.plan) && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4 text-default">🧠 WOOP 执行预案</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <WoopItem label="Wish 愿望" value={obj.wish} />
            <WoopItem label="Outcome 最佳结果" value={obj.outcome} />
            <WoopItem label="Obstacle 最大障碍" value={obj.obstacle} />
            <WoopItem label="Plan 应对计划（If-Then）" value={obj.plan} />
          </div>
        </div>
      )}

      {/* KR 进度（只读模式） */}
      {!editing && (
        <div className="card">
          <h2 className="font-semibold mb-4 text-default">🎯 Key Results</h2>
          <div className="space-y-4">
            {obj.keyResults.map(kr => {
              const p = krProgress(kr);
              return (
                <div key={kr.id} className="p-4 border border-border rounded-[var(--radius)] bg-surface-2/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-default">{kr.title}</div>
                    <span className="text-xs text-subtle">进度 {Math.round(p)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      defaultValue={Math.round(p)}
                      onMouseUp={e => updateKRProgress(kr.id, Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => updateKRProgress(kr.id, Number((e.target as HTMLInputElement).value))}
                      className="flex-1 accent-[color:var(--color-accent)]"
                    />
                    <span className="text-sm text-muted w-12 text-right">{Math.round(p)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function WoopItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="p-3 bg-surface-2 rounded-[var(--radius)]">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-default whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function WoopEdit({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="input h-20"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </div>
  );
}

function cycleLabel(cycle: string) {
  if (cycle === 'year') return '年度 OKR';
  if (cycle === 'month') return '月度 OKR';
  if (cycle === 'quarter') return '季度 OKR';
  return cycle;
}

function toISODate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 兼容历史数据：若 startValue/targetValue 仍是真实数值则按比例算；
// 否则把 currentValue 视为 0–100 的百分比直接使用。
function krProgress(kr: KeyResult): number {
  const total = kr.targetValue - kr.startValue;
  if (total > 0 && kr.targetValue !== 1) {
    return Math.max(0, Math.min(100, ((kr.currentValue - kr.startValue) / total) * 100));
  }
  return Math.max(0, Math.min(100, kr.currentValue));
}
