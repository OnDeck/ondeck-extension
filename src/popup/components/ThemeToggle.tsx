import type { ThemePreference } from '../../lib/theme';

interface Props {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center rounded-md border border-gh-border-default bg-gh-canvas-subtle p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={
              'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ' +
              (active
                ? 'bg-gh-canvas-default text-gh-fg-default'
                : 'text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
