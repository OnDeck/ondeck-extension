import type { AccountSummary } from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';
import type { ThemePreference } from '../hooks/useTheme';
import { AccountSwitcher } from './AccountSwitcher';

interface Props {
  viewer: Viewer;
  onSignOut: () => void;
  busy: boolean;
  themePreference: ThemePreference;
  onCycleTheme: () => void;
  accounts: AccountSummary[];
  activeAccountId: number | null;
  onSwitchAccount: (id: number) => void;
  onAddAccount: (token: string) => Promise<void>;
  onRemoveAccount: (id: number) => void;
}

function themeLabel(pref: ThemePreference): string {
  switch (pref) {
    case 'system':
      return 'Auto';
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
  }
}

function themeIcon(pref: ThemePreference): string {
  switch (pref) {
    case 'system':
      return '◐';
    case 'light':
      return '☀';
    case 'dark':
      return '☾';
  }
}

export function Header({
  viewer,
  onSignOut,
  busy,
  themePreference,
  onCycleTheme,
  accounts,
  activeAccountId,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
}: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-gh-border-default px-4 py-3">
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
        accounts={accounts}
        activeId={activeAccountId}
        busy={busy}
        onSwitch={onSwitchAccount}
        onAddAccount={onAddAccount}
        onRemove={onRemoveAccount}
      />
      <button
        type="button"
        onClick={onCycleTheme}
        title={`Theme: ${themeLabel(themePreference)}`}
        aria-label={`Theme: ${themeLabel(themePreference)}`}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
      >
        <span aria-hidden>{themeIcon(themePreference)}</span>
      </button>
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
