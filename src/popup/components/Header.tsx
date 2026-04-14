import type { AccountSummary } from '../../lib/accounts';
import type { ThemePreference } from '../hooks/useTheme';
import { AccountSwitcher } from './AccountSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  accounts: AccountSummary[];
  activeAccountId: string | null;
  onSwitchAccount: (id: string) => void;
  onAddAccount: () => void;
  onSignOut: (accountId: string) => void;
  busy: boolean;
  themePreference: ThemePreference;
  onCycleTheme: () => void;
}

export function Header({
  accounts,
  activeAccountId,
  onSwitchAccount,
  onAddAccount,
  onSignOut,
  busy,
  themePreference,
  onCycleTheme,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-gh-border-default px-3 py-2">
      <div className="flex-1 min-w-0">
        <AccountSwitcher
          accounts={accounts}
          activeId={activeAccountId}
          busy={busy}
          onSwitch={onSwitchAccount}
          onAddAccount={onAddAccount}
          onSignOut={onSignOut}
        />
      </div>
      <ThemeToggle preference={themePreference} onCycle={onCycleTheme} />
    </header>
  );
}
