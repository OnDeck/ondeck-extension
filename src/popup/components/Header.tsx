import type { Viewer } from '../../lib/github-api';
import type { AccountSummary } from '../hooks/useAuth';
import type { ResolvedTheme } from '../hooks/useTheme';
import { AccountSwitcher } from './AccountSwitcher';

interface Props {
  viewer: Viewer;
  accounts: AccountSummary[];
  activeLogin: string | null;
  onSignOut: () => void;
  onSwitchAccount: (login: string) => void;
  onAddAccount: () => void;
  onRemoveAccount: (login: string) => void;
  busy: boolean;
  theme: ResolvedTheme;
  onToggleTheme: () => void;
}

export function Header({
  viewer,
  accounts,
  activeLogin,
  onSignOut,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
  busy,
  theme,
  onToggleTheme,
}: Props) {
  const nextLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default bg-gh-canvas-default px-3 py-3">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-8 w-8 shrink-0 rounded-full border border-gh-border-default"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gh-fg-default">
          {viewer.name ?? viewer.login}
        </div>
        <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
      </div>
      {accounts.length > 1 ? (
        <AccountSwitcher
          accounts={accounts}
          activeLogin={activeLogin}
          onSwitch={onSwitchAccount}
          onAdd={onAddAccount}
          onRemove={onRemoveAccount}
        />
      ) : (
        <button
          type="button"
          onClick={onAddAccount}
          title="Add account"
          className="rounded-md border border-gh-border-default px-1.5 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
        >
          +
        </button>
      )}
      <button
        type="button"
        onClick={onToggleTheme}
        title={nextLabel}
        aria-label={nextLabel}
        className="rounded-md border border-gh-border-default px-1.5 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      <button
        type="button"
        onClick={onSignOut}
        disabled={busy}
        className="rounded-md border border-gh-border-default px-1.5 py-1 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis disabled:opacity-60"
      >
        Sign out
      </button>
    </header>
  );
}
