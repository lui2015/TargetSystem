import { useMemo } from 'react';

interface Props {
  checkIns: string[]; // YYYY-MM-DD 数组
  color?: string;
  weeks?: number;
}

/**
 * GitHub 风格年度热力图
 */
export default function HabitHeatmap({ checkIns, color = '#6366f1', weeks = 20 }: Props) {
  const matrix = useMemo(() => {
    const set = new Set(checkIns);
    const cols: { date: string; hit: boolean }[][] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // 找到本周周日
    const dayOfWeek = today.getDay(); // 0(Sun)..6
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() + (6 - dayOfWeek) + 1 - 7); // 本周日(周末)

    // 这里简化：按过去 N 周 * 7 天展示，列=周，行=星期
    const start = new Date(today);
    start.setDate(today.getDate() - weeks * 7);
    // 对齐到周一
    const offset = (start.getDay() + 6) % 7; // 0=Mon
    start.setDate(start.getDate() - offset);

    let cursor = new Date(start);
    for (let w = 0; w < weeks; w++) {
      const col: { date: string; hit: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = formatDate(cursor);
        const inFuture = cursor > today;
        col.push({
          date: inFuture ? '' : ds,
          hit: !inFuture && set.has(ds),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [checkIns, weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        {matrix.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, ri) => (
              <div
                key={ri}
                title={cell.date}
                className="w-[14px] h-[14px] rounded-sm"
                style={{
                  backgroundColor: !cell.date
                    ? 'transparent'
                    : cell.hit
                    ? color
                    : 'rgb(var(--c-surface-2))',
                  boxShadow: cell.hit ? `0 0 6px -1px ${color}66` : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
