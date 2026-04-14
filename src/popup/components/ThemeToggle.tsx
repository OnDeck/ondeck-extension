import type { ThemePreference } from '../theme';

interface Props {
  preference: ThemePreference;
  onChange: (pref: ThemePreference) => void;
}

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: string }> = [
  { id: 'light', label: 'Light', icon: '☀' },
  { id: 'system', label: 'Auto', icon: '◐' },
  { id: 'dark', label: 'Dark', icon: '☾' },
];

/**
 * Three-way segmented control that lives in the header. Persists through
 * chrome.storage.local and falls back to the system preference.
 */
export function ThemeToggle({ preference, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center rounded-md border border-gh-border-default bg-gh-canvas-subtle p-[2px] text-[10px]"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => onChange(opt.id)}
            className={
              'flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors ' +
              (active
                ? 'bg-gh-canvas-default text-gh-fg-default shadow'
                : 'text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            <span aria-hidden="true">{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
