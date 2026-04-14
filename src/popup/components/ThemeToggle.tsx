import type { ThemePreference } from '../hooks/useTheme';

interface Props {
  value: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeToggle({ value, onChange }: Props) {
  return (
    <div className="flex overflow-hidden rounded-md border border-gh-border-default text-[10px]">
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              'px-1.5 py-0.5 ' +
              (active
                ? 'bg-gh-canvas-subtle text-gh-fg-default'
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
