import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { MentionsTab } from './components/MentionsTab';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import type { TabId } from './tabs';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabId>('home');

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
        {tab === 'home' && <HomeTab viewer={auth.viewer} onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab !== 'home' && tab !== 'assigned' && tab !== 'mentions' && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
            This tab ships in a subsequent ticket.
          </div>
        )}
      </main>
    </div>
  );
}
