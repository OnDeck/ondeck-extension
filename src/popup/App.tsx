import { useState } from 'react';
import { AssignedPRsTab } from './components/AssignedPRsTab';
import { DashboardTab } from './components/DashboardTab';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar, type TabId } from './components/TabBar';
import { useAuth } from './hooks/useAuth';

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gh-fg-muted">
      {label} ships in a subsequent ticket.
    </div>
  );
}

export default function App() {
  const auth = useAuth();
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
      <Header viewer={auth.viewer} onSignOut={() => void auth.signOut()} busy={auth.busy} />
      <TabBar active={activeTab} onChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <DashboardTab viewer={auth.viewer} onNavigate={setActiveTab} />
        )}
        {activeTab === 'assigned' && <AssignedPRsTab viewer={auth.viewer} />}
        {activeTab === 'reviews' && <PlaceholderTab label="Reviews" />}
        {activeTab === 'mentions' && <PlaceholderTab label="Mentions" />}
        {activeTab === 'notifications' && <PlaceholderTab label="Notifications" />}
      </main>
    </div>
  );
}
