import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { CheckIn, Habit } from '../types';

interface Props {
  habit: Habit;
  onClose: () => void;
  /** 关闭/数据变更时通知父组件刷新列表 */
  onChanged?: () => void;
}

/**
 * 习惯打卡日历：月视图，可点击格子打卡 / 取消打卡 / 补卡。
 * - 今天点击：普通打卡（isMakeUp=false）
 * - 过去点击：补卡（isMakeUp=true）
 * - 未来：禁用
 * - 已打卡再次点击：取消该日期打卡
 */
export default function HabitCalendarModal({ habit, onClose, onChanged }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>(''); // 当前正在切换的日期
  const [dirty, setDirty] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await api.get<CheckIn[]>(`/checkins/habit/${habit.id}`);
      setCheckIns(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [habit.id]);

  // ESC 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const checkedSet = useMemo(() => new Set(checkIns.map(c => c.checkDate)), [checkIns]);
  const makeUpSet = useMemo(
    () => new Set(checkIns.filter(c => c.isMakeUp).map(c => c.checkDate)),
    [checkIns]
  );

  const monthCells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  // 本月统计
  const monthStat = useMemo(() => {
    const ym = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
    const inMonth = checkIns.filter(c => c.checkDate.startsWith(ym));
    return {
      total: inMonth.length,
      makeUp: inMonth.filter(c => c.isMakeUp).length,
    };
  }, [checkIns, cursor]);

  async function handleClose() {
    if (dirty) onChanged?.();
    onClose();
  }

  async function toggle(dateStr: string) {
    const cellDate = parseDate(dateStr);
    if (cellDate.getTime() > today.getTime()) return; // 未来禁用
    if (busy) return;
    setBusy(dateStr);
    try {
      const isPast = cellDate.getTime() < today.getTime();
      const wasChecked = checkedSet.has(dateStr);
      // 乐观更新
      if (wasChecked) {
        setCheckIns(prev => prev.filter(c => c.checkDate !== dateStr));
      } else {
        setCheckIns(prev => [
          {
            id: `tmp-${dateStr}`,
            habitId: habit.id,
            checkDate: dateStr,
            value: 1,
            mood: null,
            note: null,
            isMakeUp: isPast,
          },
          ...prev,
        ]);
      }
      await api.post('/checkins/toggle', {
        habitId: habit.id,
        checkDate: dateStr,
        isMakeUp: isPast && !wasChecked,
      });
      setDirty(true);
      // 与服务端对齐
      load();
    } catch (e: any) {
      alert(e?.message || '操作失败');
      load();
    } finally {
      setBusy('');
    }
  }

  function gotoMonth(delta: number) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }
  function gotoToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  const monthLabel = `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`;
  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-surface rounded-[var(--radius)] w-full max-w-md max-h-[90vh] overflow-auto border border-border shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center text-xl"
              style={{ background: `${habit.color}22` }}
            >
              {habit.icon}
            </div>
            <div>
              <div className="font-semibold text-default">{habit.name}</div>
              <div className="text-xs text-subtle">点击日期打卡 / 取消，过去日期为补卡</div>
            </div>
          </div>
          <button className="text-subtle hover:text-default" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-3">
            <button className="btn-ghost px-2" onClick={() => gotoMonth(-1)} aria-label="上个月">
              ‹
            </button>
            <div className="flex items-center gap-2">
              <div className="font-medium text-default">{monthLabel}</div>
              <button className="btn-ghost text-xs" onClick={gotoToday}>
                今天
              </button>
            </div>
            <button className="btn-ghost px-2" onClick={() => gotoMonth(1)} aria-label="下个月">
              ›
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs text-subtle">
            {weekHeaders.map(w => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const ds = formatDate(cell);
              const isToday = sameDay(cell, today);
              const isFuture = cell.getTime() > today.getTime();
              const checked = checkedSet.has(ds);
              const isMakeUp = makeUpSet.has(ds);
              const isBusy = busy === ds;

              const base =
                'aspect-square w-full rounded-[var(--radius)] border text-xs flex flex-col items-center justify-center transition relative';
              let style: React.CSSProperties = {};
              let cls = '';
              if (isFuture) {
                cls = 'border-border/50 text-subtle/40 cursor-not-allowed';
              } else if (checked) {
                cls = 'text-white font-semibold border-transparent';
                style = {
                  background: habit.color,
                  boxShadow: `0 0 10px -2px ${habit.color}99`,
                };
              } else {
                cls = 'border-border text-default hover:bg-surface-2 cursor-pointer';
              }
              if (isToday && !checked) {
                cls += ' ring-1 ring-accent/60';
              }

              return (
                <button
                  key={ds}
                  type="button"
                  disabled={isFuture || isBusy || loading}
                  onClick={() => toggle(ds)}
                  className={`${base} ${cls}`}
                  style={style}
                  title={
                    isFuture
                      ? `${ds}（未来）`
                      : checked
                      ? `${ds} 已打卡${isMakeUp ? '（补）' : ''}，点击取消`
                      : `${ds} 点击${cell.getTime() < today.getTime() ? '补卡' : '打卡'}`
                  }
                >
                  <span>{cell.getDate()}</span>
                  {checked && isMakeUp && (
                    <span className="absolute top-0.5 right-1 text-[10px] opacity-90">补</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 图例 / 统计 */}
          <div className="mt-4 flex items-center justify-between text-xs text-subtle">
            <div className="flex items-center gap-3">
              <Legend color={habit.color} label="已打卡" />
              <Legend color="transparent" border label="未打卡" />
              <Legend color="transparent" border label="补卡 (补)" />
            </div>
            <div>
              本月 <span className="text-default font-medium">{monthStat.total}</span> 次
              {monthStat.makeUp > 0 && <span className="ml-1">（补 {monthStat.makeUp}）</span>}
            </div>
          </div>

          {loading && <div className="mt-3 text-center text-subtle text-sm">加载中…</div>}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{
          background: color,
          border: border ? '1px solid rgb(var(--c-border))' : undefined,
        }}
      />
      {label}
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 构造一个月度网格：以周一为列首，前置 null 占位 */
function buildMonthGrid(monthFirst: Date): (Date | null)[] {
  const year = monthFirst.getFullYear();
  const month = monthFirst.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // JS getDay: 0=Sun..6=Sat；我们要周一作为第 1 列 → 偏移
  const leading = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  // 末尾补到 7 的倍数
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
