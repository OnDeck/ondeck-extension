import type { ThemePreference } from '../hooks/useTheme';

interface Props {
  preference: ThemePreference;
  onCycle: () => void;
}

const LABELS: Record<ThemePreference, { glyph: string; title: string }> = {
  system: { glyph: '◐', title: 'System theme (click to switch)' },
  light: { glyph: '☀', title: 'Light theme (click to switch)' },
  dark: { glyph: '☾', title: 'Dark theme (click to switch)' },
};

export function ThemeToggle({ preference, onCycle }: Props) {
  const { glyph, title } = LABELS[preference];
  return (
    <button
      type="button"
      onClick={onCycle}
      title={title}
      aria-label={title}
      className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
    >
      {glyph}
    </button>
  );
}
