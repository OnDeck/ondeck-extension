import { useState } from 'react';
import { Dashboard, type DashboardTab } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<DashboardTab | 'home'>('home');

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
          <div className="flex h-full flex-col px-4 py-3">
            <button
              type="button"
              onClick={() => setTab('home')}
              className="self-start text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
            >
              ← Back to dashboard
            </button>
            <div className="mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
              The "{tab}" view ships in a follow-up ticket.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
