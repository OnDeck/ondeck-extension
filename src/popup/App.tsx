import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar, type TabKey } from './components/TabBar';
import { Dashboard } from './components/Dashboard';
import { AssignedPRs } from './components/AssignedPRs';
import { Mentions } from './components/Mentions';
import { Reviews } from './components/Reviews';
import { Notifications } from './components/Notifications';
import { useAuth } from './hooks/useAuth';
import { useToken } from './hooks/useToken';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const token = useToken();
  const { preference, setPreference } = useTheme();
  const [tab, setTab] = useState<TabKey>('home');

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
        theme={preference}
        onThemeChange={setPreference}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <Dashboard viewer={auth.viewer} token={token} onNavigate={setTab} />
        )}
        {tab === 'assigned' && <AssignedPRs viewer={auth.viewer} token={token} />}
        {tab === 'mentions' && <Mentions viewer={auth.viewer} token={token} />}
        {tab === 'reviews' && <Reviews viewer={auth.viewer} token={token} />}
        {tab === 'notifications' && <Notifications token={token} />}
      </main>
    </div>
  );
}
