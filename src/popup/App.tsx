import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { MentionsTab } from './components/MentionsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { TabId } from './tabs';

export default function App() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
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
        activeAccountId={auth.activeAccountId}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        theme={theme}
        onThemeChange={setTheme}
        onSwitchAccount={auth.setViewer}
        onAddAccount={auth.requestAddAccount}
      />
      <TabBar active={tab} onSelect={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'home' && (
          <HomeTab
            viewer={auth.viewer}
            accountId={auth.activeAccountId}
            onNavigate={setTab}
          />
        )}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
    </div>
  );
}
