import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Objective } from '../types';

type KRDraft = {
  title: string;
};

const categories = [
  { id: 'career', label: '💼 职业' },
  { id: 'study', label: '📚 学习' },
  { id: 'health', label: '💪 健康' },
  { id: 'finance', label: '💰 财务' },
  { id: 'relation', label: '❤️ 关系' },
  { id: 'hobby', label: '🎨 兴趣' },
  { id: 'other', label: '⭐ 其他' },
];

const cycles = [
  { id: 'year', label: '🗓️ 年度 OKR', desc: '一整年要冲击的最高目标' },
  { id: 'month', label: '📅 月度 OKR', desc: '可承接年度 OKR，按月推进' },
] as const;

const templateByCategory: Record<string, { title: string; kr: KRDraft[] }[]> = {
  health: [
    {
      title: '本月养成稳定的运动习惯，提升身体素质',
      kr: [
        { title: '完成 12 次力量训练' },
        { title: '累计跑步 30 公里' },
      ],
    },
  ],
  study: [
    {
      title: '本月系统性提升专业能力，输出学习成果',
      kr: [
        { title: '读完 1 本专业书籍' },
        { title: '完成 4 篇学习笔记' },
      ],
    },
  ],
};

export default function ObjectiveWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  const [category, setCategory] = useState('career');
  const [cycle, setCycle] = useState<'year' | 'month'>('month');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toISODate(monthStart(new Date())));
  const [endDate, setEndDate] = useState(toISODate(monthEnd(new Date())));

  // 承接的年度 OKR（仅月度时启用）
  const [yearlyOkrs, setYearlyOkrs] = useState<Objective[]>([]);
  const [parentObjectiveId, setParentObjectiveId] = useState<string>('');

  const [krs, setKRs] = useState<KRDraft[]>([{ title: '' }]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // 拉取现有的年度 OKR，供月度承接使用
  useEffect(() => {
    api
      .get<Objective[]>('/objectives')
      .then(list => setYearlyOkrs(list.filter(o => o.cycle === 'year' && o.status === 'active')))
      .catch(() => setYearlyOkrs([]));
  }, []);

  // 切换周期 -> 自动调整默认时间范围
  function changeCycle(c: 'year' | 'month') {
    setCycle(c);
    if (c === 'year') {
      const today = new Date();
      const y = today.getFullYear();
      const ys = toISODate(new Date(y, 0, 1));
      const ye = toISODate(new Date(y, 11, 31));
      setStartDate(ys);
      setEndDate(ye);
      setParentObjectiveId(''); // 年度不允许承接
    } else {
      const ms = toISODate(monthStart(new Date()));
      const me = toISODate(monthEnd(new Date()));
      setStartDate(ms);
      setEndDate(me);
    }
  }

  const selectedParent = useMemo(
    () => yearlyOkrs.find(o => o.id === parentObjectiveId) || null,
    [yearlyOkrs, parentObjectiveId]
  );

  function useTemplate(tpl: { title: string; kr: KRDraft[] }) {
    setTitle(tpl.title);
    setKRs(tpl.kr.map(k => ({ ...k })));
  }

  function validateStep1(): string | null {
    if (title.length < 10) return '目标描述至少 10 字，让它更清晰';
    if (title.length > 60) return '目标描述最多 60 字，保持聚焦';
    return null;
  }

  function validateStep2(): string | null {
    if (krs.length === 0) return '至少添加一个 KR';
    for (const kr of krs) {
      if (!kr.title.trim()) return 'KR 标题不能为空';
    }
    return null;
  }

  async function submit() {
    const err1 = validateStep1();
    const err2 = validateStep2();
    if (err1 || err2) {
      setErr(err1 || err2 || '');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      await api.post('/objectives', {
        title,
        category,
        cycle,
        startDate,
        endDate,
        parentObjectiveId: cycle === 'month' && parentObjectiveId ? parentObjectiveId : null,
        keyResults: krs.map(k => ({
          title: k.title,
          // 以下字段产品已下线，给后端默认值占位即可
          metric: '-',
          startValue: 0,
          targetValue: 1,
          currentValue: 0,
          dueDate: endDate,
        })),
      });
      nav('/objectives');
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    setErr('');
    if (step === 1) {
      const e1 = validateStep1();
      if (e1) return setErr(e1);
    }
    if (step === 2) {
      const e2 = validateStep2();
      if (e2) return setErr(e2);
    }
    setStep(s => Math.min(3, s + 1));
  }

  const stepLabels = ['选择类型', '描述目标', '拆解关键结果', '确认创建'];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-default font-display">新建目标</h1>
      <div className="text-muted mb-6 text-sm">
        我们会用 <b className="text-accent">OKR + SMART</b> 帮你把目标"立得住、拆得清"。
      </div>

      {/* 步骤指示 */}
      <div className="flex items-center mb-8">
        {stepLabels.map((lbl, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                i <= step ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-subtle'
              }`}
            >
              {i + 1}
            </div>
            <div className="ml-2 text-xs text-muted hidden md:block">{lbl}</div>
            {i < stepLabels.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-accent' : 'bg-surface-2'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div>
            <h2 className="font-semibold mb-4 text-default">1. 这是一个什么类型的目标？</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`py-3 rounded-[var(--radius)] border transition ${
                    category === c.id
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-default hover:border-accent/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <h2 className="font-semibold mb-3 text-default">选择周期</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {cycles.map(c => (
                <button
                  key={c.id}
                  onClick={() => changeCycle(c.id)}
                  className={`py-4 px-4 rounded-[var(--radius)] border text-left transition ${
                    cycle === c.id
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-default hover:border-accent/50'
                  }`}
                >
                  <div className="font-semibold mb-1">{c.label}</div>
                  <div className="text-xs text-muted">{c.desc}</div>
                </button>
              ))}
            </div>

            {/* 月度 OKR：可承接的年度 OKR */}
            {cycle === 'month' && (
              <div className="mb-4">
                <label className="label">承接的年度 OKR（可选）</label>
                <select
                  className="input"
                  value={parentObjectiveId}
                  onChange={e => setParentObjectiveId(e.target.value)}
                >
                  <option value="">不承接，独立月度目标</option>
                  {yearlyOkrs.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
                {yearlyOkrs.length === 0 ? (
                  <div className="text-xs text-subtle mt-1">
                    （还没有进行中的年度 OKR，可先创建一个年度目标。）
                  </div>
                ) : (
                  <div className="text-xs text-muted mt-1">
                    选择后，本月 OKR 会显示在年度 OKR 之下，方便对齐贡献。
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">开始日期</label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">结束日期</label>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-semibold mb-2 text-default">2. 用一句话描述你的目标（Objective）</h2>
            <div className="text-xs text-muted mb-3">
              好目标 = 方向清晰 + 有感染力 + 有时间感。
              {cycle === 'month' && selectedParent && (
                <span className="block mt-1 text-accent">
                  当前正在承接年度 OKR：「{selectedParent.title}」
                </span>
              )}
            </div>
            <textarea
              className="input h-28"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={cycle === 'year' ? '今年我希望……' : '本月我希望……'}
              maxLength={80}
            />
            <div className="text-right text-xs text-subtle mt-1">{title.length} / 60+</div>

            {templateByCategory[category] && (
              <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-[var(--radius)]">
                <div className="text-xs text-accent font-medium mb-2">💡 可参考模板</div>
                {templateByCategory[category].map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => useTemplate(t)}
                    className="block text-left text-sm text-default hover:text-accent"
                  >
                    · {t.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold mb-2 text-default">3. 拆解 2–5 个 Key Results</h2>
            <div className="text-xs text-muted mb-4">
              用一句话描述每条关键结果，让它"看一眼就知道做什么"。
            </div>
            <div className="space-y-3">
              {krs.map((kr, idx) => (
                <div key={idx} className="p-3 border border-border rounded-[var(--radius)] bg-surface-2/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-subtle">KR {idx + 1}</span>
                    {krs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setKRs(list => list.filter((_, i) => i !== idx))}
                        className="text-xs text-danger"
                      >
                        移除
                      </button>
                    )}
                  </div>
                  <input
                    className="input"
                    placeholder="关键结果标题，如：完成 30 次 5 公里跑步"
                    value={kr.title}
                    onChange={e =>
                      setKRs(list => list.map((k, i) => (i === idx ? { ...k, title: e.target.value } : k)))
                    }
                  />
                </div>
              ))}
              {krs.length < 5 && (
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setKRs(list => [...list, { title: '' }])}
                >
                  + 添加 KR
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-semibold mb-4 text-default">4. 确认创建</h2>
            <div className="space-y-3 text-sm text-default">
              <Row k="类型 / 周期" v={`${category} · ${cycle === 'year' ? '年度 OKR' : '月度 OKR'}`} />
              {cycle === 'month' && selectedParent && (
                <Row k="承接" v={`年度 OKR：${selectedParent.title}`} />
              )}
              <Row k="Objective" v={title} />
              <Row k="时间范围" v={`${startDate} → ${endDate}`} />
              <div className="pt-2 border-t border-border">
                <div className="text-muted mb-2">Key Results</div>
                <ul className="space-y-1">
                  {krs.map((kr, i) => (
                    <li key={i}>· {kr.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {err && <div className="mt-4 text-sm text-danger">{err}</div>}

        <div className="flex justify-between mt-8">
          <button className="btn-ghost" onClick={() => (step === 0 ? nav(-1) : setStep(s => s - 1))}>
            {step === 0 ? '取消' : '← 上一步'}
          </button>
          {step < 3 ? (
            <button className="btn-primary" onClick={goNext}>
              下一步 →
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? '保存中…' : '🎯 创建目标'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <div className="w-full sm:w-28 text-muted text-xs sm:text-sm shrink-0">{k}</div>
      <div className="flex-1 text-default break-all">{v}</div>
    </div>
  );
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
