import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { Dashboard } from './components/Dashboard';
import { AssignedTab } from './components/tabs/AssignedTab';
import { MentionsTab } from './components/tabs/MentionsTab';
import { TabBar, type TabDef } from './tabs/TabBar';
import type { TabId } from './tabs/types';
import { useAuth } from './hooks/useAuth';
import { useCounts } from './hooks/useCounts';

const TABS: TabDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'notifications', label: 'Inbox' },
];

export default function App() {
  const auth = useAuth();
  const [active, setActive] = useState<TabId>('home');
  const counts = useCounts(auth.token, auth.viewer?.login ?? null);

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
      <TabBar tabs={TABS} active={active} onSelect={setActive} />
      <main className="flex-1 overflow-y-auto">
        {active === 'home' && (
          <Dashboard
            counts={counts.counts}
            status={counts.status}
            error={counts.error}
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
        {active !== 'home' && active !== 'assigned' && active !== 'mentions' && (
          <TabPlaceholder tab={active} />
        )}
      </main>
    </div>
  );
}

function TabPlaceholder({ tab }: { tab: TabId }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
      The <span className="mx-1 font-semibold text-gh-fg-default">{tab}</span> tab ships in a
      follow-up ticket.
    </div>
  );
}
