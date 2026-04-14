import { useState } from 'react';
import { AssignedPrsView } from './components/AssignedPrsView';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { MentionsView } from './components/MentionsView';
import { NotificationsView } from './components/NotificationsView';
import { ReviewsView } from './components/ReviewsView';
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

  if (auth.status === 'signed-out' || !auth.viewer || auth.addingAccount) {
    return <SignIn auth={auth} />;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={auth.viewer}
        accounts={auth.accounts}
        activeLogin={auth.activeLogin}
        onSignOut={() => void auth.signOut()}
        onSwitchAccount={(login) => void auth.switchAccount(login)}
        onAddAccount={auth.addAccount}
        onRemoveAccount={(login) => void auth.removeAccount(login)}
        busy={auth.busy}
        theme={theme.resolved}
        onToggleTheme={theme.toggle}
      />
      <TabNav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && (
          <Dashboard active onNavigate={setTab} activeLogin={auth.activeLogin} />
        )}
        {tab === 'assigned' && <AssignedPrsView active={tab === 'assigned'} />}
        {tab === 'mentions' && <MentionsView active={tab === 'mentions'} />}
        {tab === 'reviews' && (
          <ReviewsView active={tab === 'reviews'} activeLogin={auth.activeLogin} />
        )}
        {tab === 'notifications' && (
          <NotificationsView active={tab === 'notifications'} />
        )}
      </main>
    </div>
  );
}
