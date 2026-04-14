import { useState } from 'react';
import { getActiveAccount } from '../lib/accounts';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { WeeklyStats } from './components/WeeklyStats';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);

  // Resolve the active account id once the viewer is known so WeeklyStats
  // can scope its counters per-account.
  if (auth.viewer && accountId === null) {
    void getActiveAccount().then((a) => {
      if (a) setAccountId(a.account.id);
    });
  }

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
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        onSwitchAccount={(id) => {
          setAccountId(id);
          // Force a reload so all hooks re-fetch with the new active token.
          window.location.reload();
        }}
        onAddAccount={() => void auth.signOut()}
      />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <WeeklyStats accountId={accountId} />
        <div className="mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          Signed in. Use the switcher above to manage multiple accounts.
        </div>
      </main>
    </div>
  );
}
