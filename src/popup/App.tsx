import { useState } from 'react';
import { Dashboard, type DashboardTab } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<DashboardTab>('home');

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
        {tab === 'home' ? (
          <Dashboard viewer={auth.viewer} onNavigate={setTab} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-gh-fg-muted">
              The {tab} tab ships in a follow-up ticket.
            </p>
            <button
              type="button"
              onClick={() => setTab('home')}
              className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
            >
              Back to dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
