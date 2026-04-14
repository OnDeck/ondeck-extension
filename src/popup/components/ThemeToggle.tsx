import type { ThemePreference } from '../hooks/useTheme';

const LABELS: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

const ICONS: Record<ThemePreference, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

interface Props {
  preference: ThemePreference;
  onCycle: () => void;
}

export function ThemeToggle({ preference, onCycle }: Props) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
      title={`Theme: ${LABELS[preference]} (click to cycle)`}
    >
      <span aria-hidden>{ICONS[preference]}</span>
      <span className="sr-only">Theme: {LABELS[preference]}</span>
    </button>
  );
}
