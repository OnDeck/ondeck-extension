import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { TabId } from './tabs';
import { AssignedView } from './views/AssignedView';
import { HomeView } from './views/HomeView';
import { MentionsView } from './views/MentionsView';
import { NotificationsView } from './views/NotificationsView';
import { ReviewsView } from './views/ReviewsView';

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
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        theme={theme}
        onThemeChange={(next) => void setTheme(next)}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-hidden">
        {tab === 'home' && <HomeView token={auth.token} onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedView token={auth.token} />}
        {tab === 'reviews' && <ReviewsView token={auth.token} />}
        {tab === 'mentions' && (
          <MentionsView token={auth.token} viewerLogin={auth.viewer.login} />
        )}
        {tab === 'notifications' && <NotificationsView token={auth.token} />}
      </main>
    </div>
  );
}
