import type { ThemePreference } from '../../lib/theme';

interface Props {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div className="flex overflow-hidden rounded-md border border-gh-border-default text-[10px]">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={
            'px-1.5 py-0.5 ' +
            (preference === option.key
              ? 'bg-gh-accent-emphasis text-gh-accent-fg'
              : 'text-gh-fg-muted hover:text-gh-fg-default')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
