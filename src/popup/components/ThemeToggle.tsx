import type { ThemePreference } from '../hooks/useTheme';

interface Props {
  preference: ThemePreference;
  onChange: (pref: ThemePreference) => void;
}

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex overflow-hidden rounded-md border border-gh-border-default text-[10px]"
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === preference;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={
              'px-1.5 py-0.5 font-medium transition-colors ' +
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
