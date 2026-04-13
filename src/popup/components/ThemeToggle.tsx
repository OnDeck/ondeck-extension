import type { UseTheme } from '../hooks/useTheme';

interface Props {
  theme: UseTheme;
}

const OPTIONS: { value: 'system' | 'light' | 'dark'; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'System', icon: '⌘' },
  { value: 'dark', label: 'Dark', icon: '☾' },
];

export function ThemeToggle({ theme }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-0.5"
    >
      {OPTIONS.map((opt) => {
        const selected = theme.preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={`${opt.label} theme`}
            onClick={() => theme.setPreference(opt.value)}
            className={`rounded-md px-1.5 py-0.5 text-[11px] ${
              selected
                ? 'bg-gh-canvas-default text-gh-fg-default shadow'
                : 'text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            <span aria-hidden>{opt.icon}</span>
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
