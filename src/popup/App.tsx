import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { MentionsTab } from './components/MentionsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
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
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && (
          <Dashboard viewer={auth.viewer} onNavigate={setTab} />
        )}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab !== 'dashboard' &&
          tab !== 'assigned' &&
          tab !== 'mentions' &&
          tab !== 'reviews' && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
            This tab ships in a subsequent ticket.
          </div>
        )}
      </main>
    </div>
  );
}
