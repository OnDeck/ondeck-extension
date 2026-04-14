import { useState } from 'react';
import { AssignedPrsView } from './components/AssignedPrsView';
import { Dashboard } from './components/Dashboard';
import { MentionsView } from './components/MentionsView';
import { NotificationsView } from './components/NotificationsView';
import { ReviewsView } from './components/ReviewsView';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabNav, type TabKey } from './components/TabNav';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const [tab, setTab] = useState<TabKey>('dashboard');

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
        theme={theme.resolved}
        onToggleTheme={theme.toggle}
      />
      <TabNav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && <Dashboard active onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedPrsView active={tab === 'assigned'} />}
        {tab === 'mentions' && <MentionsView active={tab === 'mentions'} />}
        {tab === 'reviews' && <ReviewsView active={tab === 'reviews'} />}
        {tab === 'notifications' && (
          <NotificationsView active={tab === 'notifications'} />
        )}
      </main>
    </div>
  );
}
