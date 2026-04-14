import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { Tabs, type Tab } from './components/Tabs';
import { Dashboard } from './components/Dashboard';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('home');

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
      <Tabs active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'home' && (
          <Dashboard viewer={auth.viewer} onNavigate={(next) => setTab(next)} />
        )}
        {tab !== 'home' && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
            This tab ships in a subsequent ticket.
          </div>
        )}
      </main>
    </div>
  );
}
