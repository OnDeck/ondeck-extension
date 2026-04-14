import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Dashboard } from './components/Dashboard';
import { MentionsTab } from './components/MentionsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { TabId } from './navigation';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
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
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        themePreference={theme.preference}
        onCycleTheme={theme.cycle}
      />
      <TabBar active={tab} onSelect={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && (
          <Dashboard viewer={auth.viewer} onNavigate={setTab} />
        )}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
    </div>
  );
}
