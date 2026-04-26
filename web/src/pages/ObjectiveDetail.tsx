import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Objective } from '../types';

export default function ObjectiveDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [obj, setObj] = useState<Objective | null>(null);

  async function load() {
    const res = await api.get<Objective>(`/objectives/${id}`);
    setObj(res);
  }
  useEffect(() => {
    load();
  }, [id]);

  async function updateKR(krId: string, value: number) {
    await api.patch(`/objectives/kr/${krId}`, { currentValue: value });
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

  if (!obj) return <div className="p-8 text-subtle">加载中…</div>;

  const progress =
    obj.keyResults.length === 0
      ? 0
      : Math.round(
          obj.keyResults.reduce((acc, kr) => {
            const total = kr.targetValue - kr.startValue;
            if (total <= 0) return acc;
            return acc + Math.max(0, Math.min(100, ((kr.currentValue - kr.startValue) / total) * 100));
          }, 0) / obj.keyResults.length
        );

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link to="/objectives" className="hover:text-accent">← 返回目标</Link>
      </div>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-subtle mb-1">{obj.category} · {obj.cycle}</div>
            <h1 className="text-2xl font-bold text-default font-display">{obj.title}</h1>
          </div>
          <div className="flex gap-2">
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
      </div>

      {/* WOOP */}
      {(obj.wish || obj.outcome || obj.obstacle || obj.plan) && (
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

      {/* KR */}
      <div className="card">
        <h2 className="font-semibold mb-4 text-default">🎯 Key Results</h2>
        <div className="space-y-4">
          {obj.keyResults.map(kr => {
            const total = kr.targetValue - kr.startValue;
            const p =
              total <= 0 ? 0 : Math.max(0, Math.min(100, ((kr.currentValue - kr.startValue) / total) * 100));
            return (
              <div key={kr.id} className="p-4 border border-border rounded-[var(--radius)] bg-surface-2/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-default">{kr.title}</div>
                  <div className="text-xs text-subtle">
                    截止 {new Date(kr.dueDate).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted mb-2">
                  <input
                    type="number"
                    className="input w-24"
                    defaultValue={kr.currentValue}
                    onBlur={e => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v) && v !== kr.currentValue) updateKR(kr.id, v);
                    }}
                  />
                  <span>/ {kr.targetValue} {kr.metric}</span>
                  <span className="ml-auto font-semibold text-accent">{Math.round(p)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
