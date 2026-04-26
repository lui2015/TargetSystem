/**
 * 工具函数：日期、周标识计算
 */

/** 格式化为 YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 基于 ISO 周数返回 YYYY-Www */
export function getISOWeekKey(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** 本周起止（周一到周日） */
export function getWeekRange(d: Date = new Date()): { start: Date; end: Date } {
  const day = d.getDay() === 0 ? 7 : d.getDay(); // 周日=7
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - (day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** 两个日期之间的所有 YYYY-MM-DD */
export function datesBetween(start: Date, end: Date): string[] {
  const result: string[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (d <= last) {
    result.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/**
 * 根据习惯频率，判断某日期是否为"应打卡日"
 * frequencyType: daily | weekly_n | specific_days
 */
export function isScheduledDay(
  dateStr: string,
  frequencyType: string,
  frequencyValue: string
): boolean {
  if (frequencyType === 'daily') return true;
  if (frequencyType === 'specific_days') {
    const d = new Date(dateStr);
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const key = map[d.getDay()];
    return frequencyValue.split(',').map(s => s.trim()).includes(key);
  }
  // weekly_n：简化为每天都可打卡，按周统计是否达标
  return true;
}
