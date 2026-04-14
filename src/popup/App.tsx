import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { StatusMessage } from './components/StatusMessage';
import { TabNav, type TabKey } from './components/TabNav';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabKey>('dashboard');

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
      <TabNav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && <Dashboard active onNavigate={setTab} />}
        {tab === 'assigned' && (
          <StatusMessage>Assigned PRs view arrives in ticket #4.</StatusMessage>
        )}
        {tab === 'mentions' && (
          <StatusMessage>Mentions view arrives in ticket #5.</StatusMessage>
        )}
        {tab === 'reviews' && (
          <StatusMessage>Reviews view arrives in ticket #6.</StatusMessage>
        )}
        {tab === 'notifications' && (
          <StatusMessage>Notifications view arrives in ticket #7.</StatusMessage>
        )}
      </main>
    </div>
  );
}
