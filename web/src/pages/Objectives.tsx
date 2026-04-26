import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Objective } from '../types';

const categoryLabels: Record<string, string> = {
  career: '💼 职业',
  study: '📚 学习',
  health: '💪 健康',
  finance: '💰 财务',
  relation: '❤️ 关系',
  hobby: '🎨 兴趣',
  other: '⭐ 其他',
};

export default function Objectives() {
  const [list, setList] = useState<Objective[]>([]);

  async function load() {
    const res = await api.get<Objective[]>('/objectives');
    setList(res);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-default font-display">我的目标</h1>
          <div className="text-muted mt-1">科学拆解，持续追踪，稳步达成。</div>
        </div>
        <Link to="/objectives/new" className="btn-primary">
          + 新建目标
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <div className="text-lg font-medium mb-2 text-default">还没有目标，开始你的第一个吧</div>
          <div className="text-muted mb-6">我们会引导你用 OKR + WOOP 的方式科学制定目标。</div>
          <Link to="/objectives/new" className="btn-primary">立即创建</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {list.map(o => {
            const progress = calcProgress(o);
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(o.endDate).getTime() - Date.now()) / 86400000)
            );
            return (
              <Link to={`/objectives/${o.id}`} key={o.id} className="card hover:shadow-glow-sm transition">
                <div className="flex items-center gap-2 text-xs text-subtle mb-3">
                  <span>{categoryLabels[o.category] || o.category}</span>
                  <span>·</span>
                  <span>{o.cycle}</span>
                  <span className="ml-auto">剩余 {daysLeft} 天</span>
                </div>
                <div className="font-semibold text-lg mb-3 line-clamp-2 text-default">{o.title}</div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>整体进度</span>
                    <span className="font-medium text-accent">{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted">
                  {o.keyResults.length} 个关键结果
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function calcProgress(o: Objective) {
  if (o.keyResults.length === 0) return 0;
  const sum = o.keyResults.reduce((acc, kr) => {
    const total = kr.targetValue - kr.startValue;
    if (total <= 0) return acc + 0;
    const done = kr.currentValue - kr.startValue;
    const p = Math.max(0, Math.min(100, (done / total) * 100));
    return acc + p;
  }, 0);
  return Math.round(sum / o.keyResults.length);
}
