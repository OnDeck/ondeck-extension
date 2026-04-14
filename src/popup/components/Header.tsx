import type { Viewer } from '../../lib/github-api';
import type { ThemePreference } from '../../lib/theme';
import { AccountSwitcher } from './AccountSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  viewer: Viewer;
  onSignOut: () => void;
  busy: boolean;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onRequestAddAccount: () => void;
  onActiveAccountChanged: () => void;
}

export function Header({
  viewer,
  onSignOut,
  busy,
  theme,
  onThemeChange,
  onRequestAddAccount,
  onActiveAccountChanged,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default px-3 py-2">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-8 w-8 rounded-full border border-gh-border-default"
      />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold text-gh-fg-default">
          {viewer.name ?? viewer.login}
        </div>
        <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
      </div>
      <AccountSwitcher
        onRequestAddAccount={onRequestAddAccount}
        onActiveChanged={onActiveAccountChanged}
      />
      <ThemeToggle value={theme} onChange={onThemeChange} />
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
