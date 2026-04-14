import { useState } from 'react';
import { AssignedPRs } from './components/AssignedPRs';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Mentions } from './components/Mentions';
import { Notifications } from './components/Notifications';
import { Reviews } from './components/Reviews';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import type { TabId } from './tabs';

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

  const token = auth.token ?? '';
  const login = auth.viewer.login;

  return (
    <div className="flex h-full w-full flex-col">
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && (
          <Dashboard token={token} login={login} onNavigate={setTab} />
        )}
        {tab === 'prs' && <AssignedPRs token={token} login={login} />}
        {tab === 'mentions' && <Mentions token={token} login={login} />}
        {tab === 'reviews' && <Reviews token={token} login={login} />}
        {tab === 'notifications' && <Notifications token={token} />}
      </main>
    </div>
  );
}
