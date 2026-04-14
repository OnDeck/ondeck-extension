import type { ThemePreference } from '../../lib/theme';

interface Props {
  theme: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex overflow-hidden rounded-md border border-gh-border-default"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === theme;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'px-2 py-1 text-[10px] font-semibold transition-colors ' +
              (active
                ? 'bg-gh-accent-emphasis text-white'
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
