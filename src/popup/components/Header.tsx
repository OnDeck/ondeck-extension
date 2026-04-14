import type { AccountSummary } from '../../lib/accounts';
import type { Viewer } from '../../lib/github-api';
import type { UseTheme } from '../hooks/useTheme';
import { AccountSwitcher } from './AccountSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  viewer: Viewer;
  onSignOut: () => void;
  busy: boolean;
  theme: UseTheme;
  accounts: AccountSummary[];
  onSwitchAccount: (login: string) => void;
  onAddAccount: () => void;
}

export function Header({
  viewer,
  onSignOut,
  busy,
  theme,
  accounts,
  onSwitchAccount,
  onAddAccount,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default px-3 py-3">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-8 w-8 flex-none rounded-full border border-gh-border-default"
      />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold">{viewer.name ?? viewer.login}</div>
        <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
      </div>
      {accounts.length > 0 && (
        <AccountSwitcher
          accounts={accounts}
          activeLogin={viewer.login}
          onSwitch={onSwitchAccount}
          onAddAccount={onAddAccount}
        />
      )}
      <ThemeToggle theme={theme} />
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
