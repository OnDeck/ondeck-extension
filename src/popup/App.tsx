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
  const [addingAccount, setAddingAccount] = useState(false);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (addingAccount || auth.status === 'signed-out' || !auth.viewer) {
    return (
      <SignIn
        auth={auth}
        onCancel={addingAccount ? () => setAddingAccount(false) : undefined}
        onSignedIn={() => setAddingAccount(false)}
      />
    );
  }

  const viewer = auth.viewer;

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        theme={theme}
        onThemeChange={(next) => void setTheme(next)}
        accounts={auth.accounts}
        activeId={auth.activeId}
        onSwitchAccount={(id) => void auth.switchAccount(id)}
        onRemoveAccount={(id) => void auth.removeAccount(id)}
        onAddAccount={() => setAddingAccount(true)}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-hidden">
        {tab === 'home' && (
          <HomeView
            token={auth.token}
            onNavigate={setTab}
            activeAccountId={auth.activeId}
          />
        )}
        {tab === 'assigned' && <AssignedView token={auth.token} />}
        {tab === 'reviews' && (
          <ReviewsView token={auth.token} activeAccountId={auth.activeId} />
        )}
        {tab === 'mentions' && (
          <MentionsView token={auth.token} viewerLogin={viewer.login} />
        )}
        {tab === 'notifications' && <NotificationsView token={auth.token} />}
      </main>
    </div>
  );
}
