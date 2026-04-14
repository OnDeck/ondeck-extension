import type { ThemeMode } from '../../lib/theme';

interface Props {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const OPTIONS: { id: ThemeMode; label: string; glyph: string }[] = [
  { id: 'system', label: 'System', glyph: '◐' },
  { id: 'light', label: 'Light', glyph: '☀' },
  { id: 'dark', label: 'Dark', glyph: '☾' },
];

/**
 * Compact segmented control for the theme mode. Lives in the popup
 * header so it's always reachable without nesting into a settings
 * screen.
 */
export function ThemeToggle({ mode, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center rounded-md border border-gh-border-default bg-gh-canvas-subtle p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === mode;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={active}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.id)}
            className={`flex h-5 w-5 items-center justify-center rounded text-[11px] transition ${
              active
                ? 'bg-gh-canvas-default text-gh-fg-default'
                : 'text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            <span aria-hidden="true">{opt.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
