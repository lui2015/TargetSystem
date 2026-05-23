import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Review, WeeklySummary } from '../types';

export default function ReviewPage() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [current, setCurrent] = useState<Review | null>(null);
  const [history, setHistory] = useState<Review[]>([]);
  const [keep, setKeep] = useState('');
  const [problem, setProblem] = useState('');
  const [tryNext, setTryNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  async function load() {
    const [s, c, list] = await Promise.all([
      api.get<WeeklySummary>('/reviews/weekly/summary'),
      api.get<Review | null>('/reviews/current/weekly'),
      api.get<Review[]>('/reviews'),
    ]);
    setSummary(s);
    setCurrent(c);
    if (c) {
      setKeep(c.keep || '');
      setProblem(c.problem || '');
      setTryNext(c.tryNext || '');
    }
    setHistory(list);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!summary) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await api.post('/reviews', {
        type: 'weekly',
        periodKey: summary.periodKey,
        keep,
        problem,
        tryNext,
        summary: JSON.stringify(summary),
      });
      setSavedMsg('✅ 已保存，下周继续加油！');
      load();
    } catch (e: any) {
      setSavedMsg(e?.message || '保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(''), 3000);
    }
  }

  if (!summary) return <div className="p-8 text-subtle">加载中…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-default font-display">周复盘</h1>
        <div className="text-sm md:text-base text-muted mt-1 break-all">
          {summary.weekRange.start} → {summary.weekRange.end} · {summary.periodKey}
        </div>
      </div>

      {/* 本周数据：移动端 3 列紧凑 */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <DataCard label="习惯打卡次数" value={summary.checkInsCount} hint={`${summary.habitsCount} 个习惯`} />
        <DataCard
          label="习惯完成率"
          value={`${summary.habitCompletionRate}%`}
          hint="基于每日期望"
        />
        <DataCard
          label="任务完成率"
          value={`${summary.taskCompletionRate}%`}
          hint={`${summary.tasksDoneCount} / ${summary.tasksCount}`}
        />
      </div>

      {/* KPT 模板 */}
      <div className="card">
        <h2 className="font-semibold mb-4 text-default">✍️ 本周 KPT 复盘</h2>
        <KptField
          label="Keep · 本周做得好的事"
          placeholder="有哪些值得保持的做法、行为、心态？"
          value={keep}
          onChange={setKeep}
        />
        <KptField
          label="Problem · 遇到的障碍"
          placeholder="最大的卡点是什么？内在（情绪/拖延）还是外在（时间/环境）？"
          value={problem}
          onChange={setProblem}
        />
        <KptField
          label="Try · 下周的小改变"
          placeholder="下周最想尝试的一个 If-Then 策略是？"
          value={tryNext}
          onChange={setTryNext}
        />
        <div className="flex items-center gap-3 mt-4">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : current ? '更新复盘' : '保存复盘'}
          </button>
          {savedMsg && <div className="text-sm text-muted">{savedMsg}</div>}
        </div>
      </div>

      {/* 历史复盘 */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-3 text-default">历史复盘</h2>
          <div className="space-y-3">
            {history.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center gap-2 text-xs text-subtle mb-2">
                  <span className="px-2 py-0.5 bg-accent/10 text-accent rounded">
                    {r.type}
                  </span>
                  <span>{r.periodKey}</span>
                  <span className="ml-auto">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <ReviewLine label="Keep" value={r.keep} />
                <ReviewLine label="Problem" value={r.problem} />
                <ReviewLine label="Try" value={r.tryNext} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DataCard({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-surface border border-border p-3 md:p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="text-[11px] md:text-xs text-muted leading-tight">{label}</div>
      <div className="text-xl md:text-3xl font-bold mt-1 text-accent font-display leading-tight">
        {value}
      </div>
      {hint && <div className="text-[10px] md:text-xs text-subtle mt-1 truncate">{hint}</div>}
    </div>
  );
}

function KptField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      <textarea
        className="input h-24"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm mb-1">
      <span className="font-medium text-muted mr-2">{label}：</span>
      <span className="text-default whitespace-pre-wrap">{value}</span>
    </div>
  );
}
