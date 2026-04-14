import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { AssignedPrsTab } from './pages/AssignedPrsTab';
import { HomeTab } from './pages/HomeTab';
import { PlaceholderTab } from './pages/PlaceholderTab';
import type { TabId } from './tabs';
import { useAuth } from './hooks/useAuth';

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
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && <HomeTab viewer={auth.viewer} onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'mentions' && (
          <PlaceholderTab title="Mentions" description="Ships in ticket #5." />
        )}
        {tab === 'reviews' && (
          <PlaceholderTab title="Reviews" description="Ships in ticket #6." />
        )}
        {tab === 'notifications' && (
          <PlaceholderTab
            title="Notifications"
            description="Ships in ticket #7."
          />
        )}
      </main>
    </div>
  );
}
