import type { ThemePreference } from '../../lib/theme';

interface Props {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: string }> = [
  { value: 'system', label: 'System', icon: '◑' },
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
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
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={
              'px-2 py-[2px] text-[11px] ' +
              (active
                ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                : 'text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            <span aria-hidden>{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
