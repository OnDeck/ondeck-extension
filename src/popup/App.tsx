import { useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { Dashboard, type DashboardTab } from './components/Dashboard';
import { useAuth } from './hooks/useAuth';

type View = 'home' | DashboardTab;

const TAB_LABEL: Record<DashboardTab, string> = {
  assigned: 'Assigned PRs',
  reviews: 'Review requests',
  mentions: 'Mentions',
  notifications: 'Notifications',
};

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState<View>('home');

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
        {view === 'home' ? (
          <Dashboard viewer={auth.viewer} onNavigate={setView} />
        ) : (
          <TabPlaceholder label={TAB_LABEL[view]} onBack={() => setView('home')} />
        )}
      </main>
    </div>
  );
}

function TabPlaceholder({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[11px] text-gh-fg-muted hover:text-gh-accent-emphasis"
      >
        ← Back to dashboard
      </button>
      <h2 className="mt-2 text-sm font-semibold">{label}</h2>
      <div className="mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
        This tab will land in a follow-up ticket.
      </div>
    </div>
  );
}
