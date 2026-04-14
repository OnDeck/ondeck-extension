import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabNav } from './components/TabNav';
import { TabPlaceholder } from './components/TabPlaceholder';
import { useAuth } from './hooks/useAuth';
import type { TabKey } from './tabs';

const TAB_TITLES: Record<TabKey, string> = {
  home: 'Home',
  assigned: 'Assigned PRs',
  mentions: 'Mentions',
  reviews: 'Review requests',
  notifications: 'Notifications',
};

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabKey>('home');

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer || !auth.token) {
    return <SignIn auth={auth} />;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <TabNav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-hidden">
        {tab === 'home' && (
          <Dashboard token={auth.token} viewer={auth.viewer} onNavigate={setTab} />
        )}
        {tab !== 'home' && (
          <TabPlaceholder title={TAB_TITLES[tab]} onBack={() => setTab('home')} />
        )}
      </main>
    </div>
  );
}
