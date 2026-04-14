import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { AssignedPrs } from './components/AssignedPrs';
import { Dashboard } from './components/Dashboard';
import { TabPlaceholder } from './components/TabPlaceholder';
import { useAuth } from './hooks/useAuth';
import type { TabId } from './types';

const PLACEHOLDERS: Record<Exclude<TabId, 'home' | 'assigned'>, { title: string; description: string }> = {
  reviews: {
    title: 'Review requests',
    description: 'Review requests list ships in a subsequent ticket.',
  },
  mentions: {
    title: 'Mentions',
    description: 'Mentions feed ships in a subsequent ticket.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Notifications feed ships in a subsequent ticket.',
  },
};

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
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <Dashboard login={auth.viewer.login} onNavigate={setTab} />
        )}
        {tab === 'assigned' && (
          <AssignedPrs login={auth.viewer.login} onBack={() => setTab('home')} />
        )}
        {tab !== 'home' && tab !== 'assigned' && (
          <TabPlaceholder
            title={PLACEHOLDERS[tab].title}
            description={PLACEHOLDERS[tab].description}
            onBack={() => setTab('home')}
          />
        )}
      </main>
    </div>
  );
}
