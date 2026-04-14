import type { Viewer } from '../../lib/github-api';
import type { AccountSummary } from '../../lib/accounts';
import { useTheme, type ThemeChoice } from '../hooks/useTheme';
import { AccountSwitcher } from './AccountSwitcher';

interface Props {
  viewer: Viewer;
  onSignOut: () => void;
  busy: boolean;
  accounts: AccountSummary[];
  onSwitchAccount: (login: string) => void;
  onRemoveAccount: (login: string) => void;
  onAddAccount: () => void;
}

const THEME_GLYPH: Record<ThemeChoice, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

const THEME_TITLE: Record<ThemeChoice, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export function Header({
  viewer,
  onSignOut,
  busy,
  accounts,
  onSwitchAccount,
  onRemoveAccount,
  onAddAccount,
}: Props) {
  const { choice, cycle } = useTheme();
  const hasMany = accounts.length >= 2;
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default px-4 py-3">
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        className="h-8 w-8 rounded-full border border-gh-border-default"
      />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold">{viewer.name ?? viewer.login}</div>
        <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
      </div>
      {hasMany ? (
        <AccountSwitcher
          accounts={accounts}
          activeLogin={viewer.login}
          onSwitch={onSwitchAccount}
          onRemove={onRemoveAccount}
          onAddAccount={onAddAccount}
        />
      ) : (
        <button
          type="button"
          onClick={onAddAccount}
          title="Add account"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          +
        </button>
      )}
      <button
        type="button"
        onClick={cycle}
        title={THEME_TITLE[choice]}
        aria-label={THEME_TITLE[choice]}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[12px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
      >
        {THEME_GLYPH[choice]}
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
