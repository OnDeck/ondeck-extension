import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { MentionsTab } from './components/MentionsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { TabId } from './navigation';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [addingAccount, setAddingAccount] = useState(false);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  // Either no accounts yet, or the user is adding a new one on top of an
  // existing session. Both cases show the SignIn screen.
  if (auth.status === 'signed-out' || !auth.viewer || addingAccount) {
    return (
      <SignIn
        auth={auth}
        onCancel={addingAccount ? () => setAddingAccount(false) : undefined}
        onComplete={() => setAddingAccount(false)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        accounts={auth.accounts}
        activeAccountId={auth.accountId}
        onSwitchAccount={(id) => void auth.switchAccount(id)}
        onAddAccount={() => setAddingAccount(true)}
        onSignOut={(id) => void auth.signOut(id)}
        busy={auth.busy}
        themePreference={theme.preference}
        onCycleTheme={theme.cycle}
      />
      <TabBar active={tab} onSelect={setTab} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'dashboard' && (
          <Dashboard
            viewer={auth.viewer}
            accountId={auth.accountId}
            onNavigate={setTab}
          />
        )}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
    </div>
  );
}
