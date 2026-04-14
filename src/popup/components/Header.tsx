import type { AccountSummary } from '../../lib/auth';
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
  accounts: AccountSummary[];
  activeId: number | null;
  onSwitchAccount: (id: number) => void;
  onRemoveAccount: (id: number) => void;
  onAddAccount: () => void;
}

export function Header({
  viewer,
  onSignOut,
  busy,
  theme,
  onThemeChange,
  accounts,
  activeId,
  onSwitchAccount,
  onRemoveAccount,
  onAddAccount,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default px-3 py-2">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-7 w-7 rounded-full border border-gh-border-default"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-gh-fg-default">
          {viewer.name ?? viewer.login}
        </div>
        <div className="truncate text-[10px] text-gh-fg-muted">@{viewer.login}</div>
      </div>
      <AccountSwitcher
        accounts={accounts}
        activeId={activeId}
        onSwitch={onSwitchAccount}
        onRemove={onRemoveAccount}
        onAdd={onAddAccount}
      />
      <ThemeToggle theme={theme} onChange={onThemeChange} />
      <button
        type="button"
        onClick={onSignOut}
        disabled={busy}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis disabled:opacity-60"
      >
        Sign out
      </button>
    </header>
  );
}
