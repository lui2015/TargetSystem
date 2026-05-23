import { useEffect, useMemo, useState } from 'react';
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

  // 拆分年度 / 月度
  const yearly = useMemo(() => list.filter(o => o.cycle === 'year'), [list]);
  const monthly = useMemo(() => list.filter(o => o.cycle === 'month'), [list]);
  // 其它历史 cycle（如 quarter）兼容展示
  const others = useMemo(
    () => list.filter(o => o.cycle !== 'year' && o.cycle !== 'month'),
    [list]
  );

  // 月度按承接的年度 OKR 分组（无承接 -> __none__）
  const monthlyGrouped = useMemo(() => {
    const map = new Map<string, Objective[]>();
    monthly.forEach(o => {
      const key = o.parentObjectiveId || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [monthly]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-default font-display">我的目标</h1>
          <div className="text-sm md:text-base text-muted mt-1">
            年度定方向 · 月度抓落地，OKR 上下对齐。
          </div>
        </div>
        <Link to="/objectives/new" className="btn-primary w-full md:w-auto">
          + 新建目标
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <div className="text-lg font-medium mb-2 text-default">还没有目标，开始你的第一个吧</div>
          <div className="text-muted mb-6">建议先建一个年度 OKR，再用月度 OKR 承接它。</div>
          <Link to="/objectives/new" className="btn-primary">立即创建</Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 年度 OKR */}
          <Section
            title="🗓️ 年度 OKR"
            desc="一年里要冲击的最高级目标，是月度 OKR 的方向锚点。"
            count={yearly.length}
          >
            {yearly.length === 0 ? (
              <EmptyHint text="还没有年度 OKR。先定一个全年方向？" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {yearly.map(o => (
                  <ObjectiveCard key={o.id} obj={o} childCount={monthlyGrouped.get(o.id)?.length ?? 0} />
                ))}
              </div>
            )}
          </Section>

          {/* 月度 OKR */}
          <Section
            title="📅 月度 OKR"
            desc="按月推进，可承接年度 OKR 形成对齐链路。"
            count={monthly.length}
          >
            {monthly.length === 0 ? (
              <EmptyHint text="还没有月度 OKR。给本月定一个聚焦目标吧。" />
            ) : (
              <div className="space-y-6">
                {/* 先按年度父级分组展示 */}
                {yearly.map(parent => {
                  const kids = monthlyGrouped.get(parent.id) || [];
                  if (kids.length === 0) return null;
                  return (
                    <div key={parent.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-subtle">承接</span>
                        <Link
                          to={`/objectives/${parent.id}`}
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          🗓️ {parent.title}
                        </Link>
                        <span className="text-xs text-subtle">· {kids.length} 个月度</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-4 border-l-2 border-accent/30">
                        {kids.map(o => (
                          <ObjectiveCard key={o.id} obj={o} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* 未承接的独立月度 OKR */}
                {(monthlyGrouped.get('__none__') || []).length > 0 && (
                  <div>
                    <div className="text-xs text-subtle mb-3">独立月度 OKR（未承接年度）</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {(monthlyGrouped.get('__none__') || []).map(o => (
                        <ObjectiveCard key={o.id} obj={o} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 历史遗留：季度等其它周期的目标 */}
          {others.length > 0 && (
            <Section title="📦 其它周期" desc="历史目标（如季度 OKR），保留兼容。" count={others.length}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {others.map(o => (
                  <ObjectiveCard key={o.id} obj={o} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  desc,
  count,
  children,
}: {
  title: string;
  desc: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-lg md:text-xl font-semibold text-default">{title}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted">{count}</span>
        </div>
        <div className="text-xs text-subtle mt-1 md:mt-0 md:inline md:ml-2">{desc}</div>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="card text-sm text-muted py-8 text-center">{text}</div>
  );
}

function ObjectiveCard({ obj, childCount }: { obj: Objective; childCount?: number }) {
  const progress = calcProgress(obj);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(obj.endDate).getTime() - Date.now()) / 86400000)
  );
  return (
    <Link to={`/objectives/${obj.id}`} className="card hover:shadow-glow-sm transition block">
      <div className="flex items-center gap-2 text-xs text-subtle mb-3 flex-wrap">
        <span>{categoryLabels[obj.category] || obj.category}</span>
        <span>·</span>
        <span>{cycleLabel(obj.cycle)}</span>
        {obj.parent && (
          <span className="text-accent" title="承接的年度 OKR">
            ↗ {obj.parent.title}
          </span>
        )}
        <span className="ml-auto">剩余 {daysLeft} 天</span>
      </div>
      <div className="font-semibold text-lg mb-3 line-clamp-2 text-default">{obj.title}</div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>整体进度</span>
          <span className="font-medium text-accent">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="text-xs text-muted flex items-center gap-3">
        <span>{obj.keyResults.length} 个关键结果</span>
        {typeof childCount === 'number' && childCount > 0 && (
          <span className="text-accent">· 已被 {childCount} 个月度 OKR 承接</span>
        )}
      </div>
    </Link>
  );
}

function cycleLabel(cycle: string) {
  if (cycle === 'year') return '年度';
  if (cycle === 'month') return '月度';
  if (cycle === 'quarter') return '季度';
  return cycle;
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
