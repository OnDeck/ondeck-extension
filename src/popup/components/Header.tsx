import type { Viewer } from '../../lib/github-api';
import type { AccountSummary } from '../../lib/accounts';
import { ThemeToggle } from './ThemeToggle';
import { AccountSwitcher } from './AccountSwitcher';
import type { ThemePreference } from '../theme';

interface Props {
  viewer: Viewer;
  accounts: AccountSummary[];
  activeId: number | null;
  onSignOut: () => void;
  onSwitchAccount: (id: number) => void;
  onSignOutAccount: (id: number) => void;
  onAddAccount: () => void;
  busy: boolean;
  themePreference: ThemePreference;
  onThemeChange: (pref: ThemePreference) => void;
}

export function Header({
  viewer,
  accounts,
  activeId,
  onSignOut,
  onSwitchAccount,
  onSignOutAccount,
  onAddAccount,
  busy,
  themePreference,
  onThemeChange,
}: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-gh-border-default bg-gh-canvas-default px-4 py-3">
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
      {accounts.length > 1 && (
        <AccountSwitcher
          accounts={accounts}
          activeId={activeId}
          onSwitch={onSwitchAccount}
          onSignOut={onSignOutAccount}
          onAddAccount={onAddAccount}
        />
      )}
      <ThemeToggle preference={themePreference} onChange={onThemeChange} />
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
