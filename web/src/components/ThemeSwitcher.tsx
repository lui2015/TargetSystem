import { useEffect, useRef, useState } from 'react';
import { THEMES, ThemeId, useTheme, applyTheme } from '../store/theme';

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  const choose = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-border bg-surface hover:bg-surface-2 transition text-sm"
        title="切换主题"
      >
        <span className="flex gap-0.5">
          {current.swatch.map((c, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full border border-black/10"
              style={{ background: c }}
            />
          ))}
        </span>
        {!compact && (
          <>
            <span className="flex-1 text-left truncate text-default">{current.name}</span>
            <span className="text-subtle">▾</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-30 rounded-[var(--radius)] border border-border bg-surface shadow-lg p-1.5 max-h-80 overflow-auto">
          <div className="px-2 py-1.5 text-[11px] text-subtle uppercase tracking-wider">
            选择主题
          </div>
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-[var(--radius)] text-left transition ${
                  active ? 'bg-surface-2' : 'hover:bg-surface-2'
                }`}
              >
                <span className="flex gap-0.5 shrink-0">
                  {t.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-default truncate">{t.name}</div>
                  <div className="text-[11px] text-muted truncate">{t.description}</div>
                </span>
                {active && <span className="text-accent text-xs">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
