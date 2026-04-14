import type { ThemePref } from '../hooks/useTheme';

interface Props {
  pref: ThemePref;
  onCycle: () => void;
}

const LABELS: Record<ThemePref, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

const ICONS: Record<ThemePref, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

export function ThemeToggle({ pref, onCycle }: Props) {
  return (
    <button
      type="button"
      onClick={onCycle}
      title={`Theme: ${LABELS[pref]} (click to change)`}
      className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
    >
      <span className="mr-1 font-mono">{ICONS[pref]}</span>
      {LABELS[pref]}
    </button>
  );
}
