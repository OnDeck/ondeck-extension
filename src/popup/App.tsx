import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { AssignedPrs } from './components/AssignedPrs';
import { Dashboard } from './components/Dashboard';
import { Mentions } from './components/Mentions';
import { Notifications } from './components/Notifications';
import { Reviews } from './components/Reviews';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { TabId } from './types';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
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
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        themePreference={theme.preference}
        onCycleTheme={theme.cycle}
      />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <Dashboard login={auth.viewer.login} onNavigate={setTab} />
        )}
        {tab === 'assigned' && (
          <AssignedPrs login={auth.viewer.login} onBack={() => setTab('home')} />
        )}
        {tab === 'mentions' && (
          <Mentions login={auth.viewer.login} onBack={() => setTab('home')} />
        )}
        {tab === 'reviews' && (
          <Reviews login={auth.viewer.login} onBack={() => setTab('home')} />
        )}
        {tab === 'notifications' && (
          <Notifications onBack={() => setTab('home')} />
        )}
      </main>
    </div>
  );
}
