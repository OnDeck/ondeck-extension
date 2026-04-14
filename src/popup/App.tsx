import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { AccountSwitcher } from './components/AccountSwitcher';
import { WeeklyStats } from './components/WeeklyStats';
import { useAuth } from './hooks/useAuth';
import { getActiveCredentials, type AccountSummary } from '../lib/accounts';

export default function App() {
  const auth = useAuth();
  const [activeAccount, setActiveAccount] = useState<AccountSummary | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const loadActive = useCallback(async () => {
    const creds = await getActiveCredentials();
    if (creds) {
      setActiveAccount({ id: `gh-${creds.viewer.id}`, viewer: creds.viewer, isActive: true });
    }
    setBootstrapping(false);
  }, []);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  if (auth.status === 'loading' || bootstrapping) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  // Multi-account layer takes precedence if any account is registered.
  if (activeAccount) {
    return (
      <div className="flex h-full w-full flex-col">
        <Header
          viewer={activeAccount.viewer}
          onSignOut={() => void auth.signOut()}
          busy={auth.busy}
        />
        <main className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          <WeeklyStats accountId={activeAccount.id} />
          <AccountSwitcher onActiveChange={setActiveAccount} />
        </main>
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer) {
    return (
      <div className="flex h-full w-full flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-3">
          <AccountSwitcher onActiveChange={setActiveAccount} />
          <div className="mt-2">
            <SignIn auth={auth} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <main className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        <AccountSwitcher onActiveChange={setActiveAccount} />
      </main>
    </div>
  );
}
