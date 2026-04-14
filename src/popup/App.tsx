import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { AccountSwitcher } from './components/AccountSwitcher';
import { AnalyticsCard } from './components/AnalyticsCard';
import { useAuth } from './hooks/useAuth';
import { useAccounts } from './hooks/useAccounts';

export default function App() {
  const auth = useAuth();
  const accounts = useAccounts();

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer) {
    return <SignIn auth={auth} />;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <main className="flex-1 overflow-y-auto">
        <AccountSwitcher
          accounts={accounts.accounts}
          onSwitch={(id) => void accounts.switchAccount(id)}
          onRemove={(id) => void accounts.removeAccount(id)}
          onAdd={(token) => accounts.addAccount(token)}
        />
        <AnalyticsCard stats={accounts.stats} onChange={() => void accounts.refresh()} />
      </main>
    </div>
  );
}
