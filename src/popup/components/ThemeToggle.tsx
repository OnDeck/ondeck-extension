import type { ThemePreference } from '../../lib/theme';

interface Props {
  preference: ThemePreference;
  onChange: (pref: ThemePreference) => void;
}

const OPTIONS: { value: ThemePreference; label: string; title: string }[] = [
  { value: 'system', label: 'Auto', title: 'Follow system preference' },
  { value: 'light', label: 'Light', title: 'Light theme' },
  { value: 'dark', label: 'Dark', title: 'Dark theme' },
];

export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex overflow-hidden rounded-md border border-gh-border-default text-[10px]"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`px-1.5 py-0.5 transition ${
              active
                ? 'bg-gh-accent-emphasis text-gh-fg-on-emphasis'
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
