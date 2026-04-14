import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { DashboardTab } from './components/DashboardTab';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { MentionsTab } from './components/MentionsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { useAuth } from './hooks/useAuth';
import { useDashboard } from './hooks/useDashboard';
import type { TabId } from './tabs';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabId>('dashboard');
  const dashboard = useDashboard(auth.viewer?.login, auth.token);

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
          <DashboardTab viewer={auth.viewer} dashboard={dashboard} onNavigate={setTab} />
        )}
        {tab === 'assigned' && auth.token && (
          <AssignedPrsTab login={auth.viewer.login} token={auth.token} />
        )}
        {tab === 'mentions' && auth.token && (
          <MentionsTab login={auth.viewer.login} token={auth.token} />
        )}
        {tab === 'reviews' && auth.token && (
          <ReviewsTab login={auth.viewer.login} token={auth.token} />
        )}
        {tab === 'notifications' && auth.token && (
          <NotificationsTab token={auth.token} />
        )}
      </main>
    </div>
  );
}
