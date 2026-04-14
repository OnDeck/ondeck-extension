import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { TabPlaceholder } from './components/TabPlaceholder';
import { useAuth } from './hooks/useAuth';
import type { TabId } from './navigation';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabId>('dashboard');

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
      <TabBar active={tab} onSelect={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && (
          <Dashboard viewer={auth.viewer} onNavigate={setTab} />
        )}
        {tab === 'assigned' && (
          <TabPlaceholder
            title="Assigned PRs"
            description="The assigned-PRs feed lands in ticket #4."
          />
        )}
        {tab === 'reviews' && (
          <TabPlaceholder
            title="Reviews"
            description="Review-requests feed lands in ticket #6."
          />
        )}
        {tab === 'mentions' && (
          <TabPlaceholder
            title="Mentions"
            description="Mentions feed lands in ticket #5."
          />
        )}
        {tab === 'notifications' && (
          <TabPlaceholder
            title="Notifications"
            description="Notifications feed lands in ticket #7."
          />
        )}
      </main>
    </div>
  );
}
