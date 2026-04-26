import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type KRDraft = {
  title: string;
  metric: string;
  targetValue: string;
  dueDate: string;
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
  { id: 'year', label: '年度目标' },
  { id: 'quarter', label: '季度目标' },
  { id: 'month', label: '月度目标' },
];

const templateByCategory: Record<string, { title: string; kr: KRDraft[] }[]> = {
  health: [
    {
      title: '本季度养成稳定的运动习惯，提升身体素质',
      kr: [
        { title: '完成 36 次力量训练', metric: '次', targetValue: '36', dueDate: '' },
        { title: '累计跑步 100 公里', metric: '公里', targetValue: '100', dueDate: '' },
      ],
    },
  ],
  study: [
    {
      title: '本季度系统性提升专业能力，输出学习成果',
      kr: [
        { title: '读完 3 本专业书籍', metric: '本', targetValue: '3', dueDate: '' },
        { title: '完成 10 篇学习笔记/博客', metric: '篇', targetValue: '10', dueDate: '' },
      ],
    },
  ],
};

export default function ObjectiveWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  const [category, setCategory] = useState('career');
  const [cycle, setCycle] = useState('quarter');
  const [title, setTitle] = useState('');
  const [startDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState(
    toISODate(new Date(Date.now() + 90 * 86400000))
  );

  const [krs, setKRs] = useState<KRDraft[]>([
    { title: '', metric: '次', targetValue: '', dueDate: endDate },
  ]);

  const [wish, setWish] = useState('');
  const [outcome, setOutcome] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [plan, setPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  function useTemplate(tpl: { title: string; kr: KRDraft[] }) {
    setTitle(tpl.title);
    setKRs(tpl.kr.map(k => ({ ...k, dueDate: endDate })));
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
      if (!kr.metric.trim()) return 'KR 需要一个度量单位（SMART 原则：Measurable）';
      const tv = Number(kr.targetValue);
      if (!Number.isFinite(tv) || tv <= 0)
        return 'KR 必须有一个大于 0 的目标数值（Measurable）';
      if (!kr.dueDate) return 'KR 需要有截止日期（Time-bound）';
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
        wish,
        outcome,
        obstacle,
        plan,
        keyResults: krs.map(k => ({
          title: k.title,
          metric: k.metric,
          startValue: 0,
          targetValue: Number(k.targetValue),
          currentValue: 0,
          dueDate: k.dueDate,
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
    setStep(s => Math.min(4, s + 1));
  }

  const stepLabels = ['选择类型', '描述目标', '拆解关键结果', 'WOOP 预案', '确认创建'];

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-1 text-default font-display">新建目标</h1>
      <div className="text-muted mb-6 text-sm">
        我们会用 <b className="text-accent">OKR + SMART + WOOP</b> 帮你把目标"立得住、拆得清、扛得住"。
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
            <div className="grid grid-cols-3 gap-3 mb-6">
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
            <div className="grid grid-cols-3 gap-3 mb-4">
              {cycles.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  className={`py-3 rounded-[var(--radius)] border transition ${
                    cycle === c.id
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-default hover:border-accent/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">开始日期</label>
                <input className="input" value={startDate} disabled />
              </div>
              <div>
                <label className="label">结束日期</label>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setKRs(list => list.map(k => ({ ...k, dueDate: k.dueDate || e.target.value })));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-semibold mb-2 text-default">2. 用一句话描述你的目标（Objective）</h2>
            <div className="text-xs text-muted mb-3">
              好目标 = 方向清晰 + 有感染力 + 有时间感。示例：<i>"本季度把跑步变成每周 3 次的稳定习惯"</i>
            </div>
            <textarea
              className="input h-28"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="本季度/今年 我希望……"
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
            <h2 className="font-semibold mb-2 text-default">3. 拆解 2–5 个 Key Results（SMART 校验）</h2>
            <div className="text-xs text-muted mb-4">
              每个 KR 必须是"可量化 + 有目标值 + 有截止日期"。
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
                    className="input mb-2"
                    placeholder="关键结果标题，如：完成 30 次 5 公里跑步"
                    value={kr.title}
                    onChange={e =>
                      setKRs(list => list.map((k, i) => (i === idx ? { ...k, title: e.target.value } : k)))
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="input"
                      placeholder="目标数值"
                      type="number"
                      value={kr.targetValue}
                      onChange={e =>
                        setKRs(list =>
                          list.map((k, i) => (i === idx ? { ...k, targetValue: e.target.value } : k))
                        )
                      }
                    />
                    <input
                      className="input"
                      placeholder="单位（次/本/公里…）"
                      value={kr.metric}
                      onChange={e =>
                        setKRs(list =>
                          list.map((k, i) => (i === idx ? { ...k, metric: e.target.value } : k))
                        )
                      }
                    />
                    <input
                      className="input"
                      type="date"
                      value={kr.dueDate}
                      onChange={e =>
                        setKRs(list =>
                          list.map((k, i) => (i === idx ? { ...k, dueDate: e.target.value } : k))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              {krs.length < 5 && (
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() =>
                    setKRs(list => [...list, { title: '', metric: '次', targetValue: '', dueDate: endDate }])
                  }
                >
                  + 添加 KR
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-semibold mb-2 text-default">4. WOOP 执行预案</h2>
            <div className="text-xs text-muted mb-4">
              心理学证实：提前预想障碍 + 写下"If-Then"应对，目标达成率大幅提升。
            </div>
            <WoopField label="W · Wish 愿望" placeholder="我想做到的是……" value={wish} setValue={setWish} />
            <WoopField label="O · Outcome 最佳结果" placeholder="达成后最大的好处是……" value={outcome} setValue={setOutcome} />
            <WoopField label="O · Obstacle 最大障碍" placeholder="最可能阻碍我的是……（内在）" value={obstacle} setValue={setObstacle} />
            <WoopField label="P · Plan If-Then 应对" placeholder="当 [障碍] 发生时，我就 [替代行动]" value={plan} setValue={setPlan} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-semibold mb-4 text-default">5. 确认创建</h2>
            <div className="space-y-3 text-sm text-default">
              <Row k="类型 / 周期" v={`${category} · ${cycle}`} />
              <Row k="Objective" v={title} />
              <Row k="时间范围" v={`${startDate} → ${endDate}`} />
              <div className="pt-2 border-t border-border">
                <div className="text-muted mb-2">Key Results</div>
                <ul className="space-y-1">
                  {krs.map((kr, i) => (
                    <li key={i}>
                      · {kr.title} —— 目标 {kr.targetValue} {kr.metric}（{kr.dueDate}）
                    </li>
                  ))}
                </ul>
              </div>
              {(wish || outcome || obstacle || plan) && (
                <div className="pt-2 border-t border-border text-muted">
                  <div className="text-subtle mb-1">WOOP</div>
                  {wish && <div>· W：{wish}</div>}
                  {outcome && <div>· O：{outcome}</div>}
                  {obstacle && <div>· O：{obstacle}</div>}
                  {plan && <div>· P：{plan}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {err && <div className="mt-4 text-sm text-danger">{err}</div>}

        <div className="flex justify-between mt-8">
          <button className="btn-ghost" onClick={() => (step === 0 ? nav(-1) : setStep(s => s - 1))}>
            {step === 0 ? '取消' : '← 上一步'}
          </button>
          {step < 4 ? (
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

function WoopField({
  label,
  placeholder,
  value,
  setValue,
}: {
  label: string;
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      <textarea
        className="input h-20"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-28 text-muted">{k}</div>
      <div className="flex-1 text-default">{v}</div>
    </div>
  );
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
