import { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar } from './components/TabBar';
import { AssignedPrsTab } from './pages/AssignedPrsTab';
import { HomeTab } from './pages/HomeTab';
import { MentionsTab } from './pages/MentionsTab';
import { NotificationsTab } from './pages/NotificationsTab';
import { ReviewsTab } from './pages/ReviewsTab';
import type { TabId } from './tabs';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<TabId>('home');
  const [addingAccount, setAddingAccount] = useState(false);

  const handleActiveAccountChanged = useCallback(() => {
    void auth.reload();
  }, [auth]);

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

  if (addingAccount) {
    const addAuth = {
      ...auth,
      signInWithPat: async (token: string) => {
        await auth.addAccountWithPat(token);
        setAddingAccount(false);
      },
    };
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gh-border-default px-3 py-2">
          <div className="text-xs font-semibold text-gh-fg-default">Add account</div>
          <button
            type="button"
            onClick={() => setAddingAccount(false)}
            className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SignIn auth={addAuth} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        theme={theme}
        onThemeChange={setTheme}
        onRequestAddAccount={() => setAddingAccount(true)}
        onActiveAccountChanged={handleActiveAccountChanged}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && <HomeTab viewer={auth.viewer} onNavigate={setTab} />}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
    </div>
  );
}
