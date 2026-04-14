import type { ThemePreference, UseTheme } from '../hooks/useTheme';

interface Props {
  theme: UseTheme;
}

const OPTIONS: { value: ThemePreference; label: string; title: string }[] = [
  { value: 'system', label: '◐', title: 'System theme' },
  { value: 'light', label: '☀', title: 'Light theme' },
  { value: 'dark', label: '☾', title: 'Dark theme' },
];

export function ThemeToggle({ theme }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-gh-border-default p-0.5">
      {OPTIONS.map((opt) => {
        const active = theme.preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            aria-label={opt.title}
            onClick={() => theme.setPreference(opt.value)}
            className={
              'h-5 w-5 rounded-md text-[11px] leading-none transition-colors ' +
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
