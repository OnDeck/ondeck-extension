import { useState } from 'react';
import { AssignedPRsTab } from './components/AssignedPRsTab';
import { DashboardTab } from './components/DashboardTab';
import { MentionsTab } from './components/MentionsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar, type TabId } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('home');

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
        theme={theme}
      />
      <TabBar active={activeTab} onChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <DashboardTab viewer={auth.viewer} onNavigate={setActiveTab} />
        )}
        {activeTab === 'assigned' && <AssignedPRsTab viewer={auth.viewer} />}
        {activeTab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {activeTab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </main>
    </div>
  );
}
