import type { ThemePreference } from '../hooks/useTheme';

interface Props {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex overflow-hidden rounded-md border border-gh-border-default"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              active
                ? 'bg-gh-accent-emphasis text-white'
                : 'text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
