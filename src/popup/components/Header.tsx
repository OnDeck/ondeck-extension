import type { Viewer } from '../../lib/github-api';
import type { ThemePreference } from '../../lib/theme';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  viewer: Viewer;
  onSignOut: () => void;
  busy: boolean;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export function Header({ viewer, onSignOut, busy, theme, onThemeChange }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-gh-border-default px-4 py-3">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-8 w-8 rounded-full border border-gh-border-default"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gh-fg-default">
          {viewer.name ?? viewer.login}
        </div>
        <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
      </div>
      <ThemeToggle theme={theme} onChange={onThemeChange} />
      <button
        type="button"
        onClick={onSignOut}
        disabled={busy}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis disabled:opacity-60"
      >
        Sign out
      </button>
    </header>
  );
}
