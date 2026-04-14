import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar, type TabId } from './components/TabBar';
import { useAuth } from './hooks/useAuth';

const PrGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.5.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM11 2.5h-1V.75a.75.75 0 0 0-1.28-.53L6.97 1.97a.75.75 0 0 0 0 1.06l1.75 1.75a.751.751 0 0 0 1.042-.018.751.751 0 0 0 .218-.532V3h1a1 1 0 0 1 1 1v6.628a2.251 2.251 0 1 0 1.5 0V4A2.5 2.5 0 0 0 11 2.5Z" />
  </svg>
);

const HomeGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366Z" />
  </svg>
);

export default function App() {
  const auth = useAuth();
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
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && <Dashboard viewer={auth.viewer} onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
      </main>
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'home', label: 'Home', icon: HomeGlyph },
          { id: 'assigned', label: 'Assigned', icon: PrGlyph },
        ]}
      />
    </div>
  );
}
