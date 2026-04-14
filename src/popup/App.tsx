import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { Dashboard } from './components/Dashboard';
import { AssignedTab } from './components/tabs/AssignedTab';
import { MentionsTab } from './components/tabs/MentionsTab';
import { ReviewsTab } from './components/tabs/ReviewsTab';
import { NotificationsTab } from './components/tabs/NotificationsTab';
import { TabBar, type TabDef } from './tabs/TabBar';
import type { TabId } from './tabs/types';
import { useAuth } from './hooks/useAuth';
import { useCounts } from './hooks/useCounts';
import { useTheme } from './hooks/useTheme';
import { useAccounts } from './hooks/useAccounts';

const TABS: TabDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'notifications', label: 'Inbox' },
];

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const accounts = useAccounts();
  const [active, setActive] = useState<TabId>('home');
  const [addingAccount, setAddingAccount] = useState(false);
  const counts = useCounts(auth.token, auth.viewer?.login ?? null);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer || addingAccount) {
    return (
      <SignIn
        auth={auth}
        addingAccount={addingAccount}
        onCancelAdd={() => setAddingAccount(false)}
        onAdded={async () => {
          await accounts.refresh();
          setAddingAccount(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={auth.viewer}
        accounts={accounts.accounts}
        activeId={accounts.activeId}
        onSignOut={async () => {
          await auth.signOut();
          await accounts.refresh();
        }}
        onSwitchAccount={async (id) => {
          await accounts.switchTo(id);
          await auth.reload();
        }}
        onSignOutAccount={async (id) => {
          await accounts.signOutAccount(id);
          await auth.reload();
        }}
        onAddAccount={() => setAddingAccount(true)}
        busy={auth.busy}
        themePreference={theme.preference}
        onThemeChange={theme.setPreference}
      />
      <TabBar tabs={TABS} active={active} onSelect={setActive} />
      <main className="flex-1 overflow-y-auto">
        {active === 'home' && (
          <Dashboard
            counts={counts.counts}
            status={counts.status}
            error={counts.error}
            accountId={auth.viewer.id}
            onNavigate={setActive}
            onRefresh={() => void counts.refresh()}
          />
        )}
        {active === 'assigned' && (
          <AssignedTab token={auth.token} login={auth.viewer.login} />
        )}
        {active === 'mentions' && (
          <MentionsTab token={auth.token} login={auth.viewer.login} />
        )}
        {active === 'reviews' && (
          <ReviewsTab
            token={auth.token}
            login={auth.viewer.login}
            accountId={auth.viewer.id}
          />
        )}
        {active === 'notifications' && <NotificationsTab token={auth.token} />}
      </main>
    </div>
  );
}
