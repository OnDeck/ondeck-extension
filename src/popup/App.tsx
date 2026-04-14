import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { TabBar, type TabKey } from './components/TabBar';
import { Dashboard } from './components/Dashboard';
import { AssignedPRs } from './components/AssignedPRs';
import { Mentions } from './components/Mentions';
import { Reviews } from './components/Reviews';
import { Notifications } from './components/Notifications';
import { useAuth } from './hooks/useAuth';
import { useToken } from './hooks/useToken';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const token = useToken();
  const { preference, setPreference } = useTheme();
  const [tab, setTab] = useState<TabKey>('home');
  const [addingAccount, setAddingAccount] = useState(false);
  const [statsTick, setStatsTick] = useState(0);

  // Reload the token hook after a switch or sign-in.
  const [, setTokenTick] = useState(0);
  useEffect(() => {
    setTokenTick((n) => n + 1);
  }, [auth.viewer?.id]);

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
        onCancel={
          addingAccount && auth.viewer
            ? () => setAddingAccount(false)
            : undefined
        }
        onSignedIn={() => {
          setAddingAccount(false);
          void auth.reload();
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut().then(() => auth.reload())}
        busy={auth.busy}
        theme={preference}
        onThemeChange={setPreference}
        onAccountSwitch={() => void auth.reload()}
        onAddAccount={() => setAddingAccount(true)}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <Dashboard
            viewer={auth.viewer}
            token={token}
            onNavigate={setTab}
            statsTick={statsTick}
          />
        )}
        {tab === 'assigned' && <AssignedPRs viewer={auth.viewer} token={token} />}
        {tab === 'mentions' && <Mentions viewer={auth.viewer} token={token} />}
        {tab === 'reviews' && (
          <Reviews
            viewer={auth.viewer}
            token={token}
            onReviewSubmitted={() => setStatsTick((n) => n + 1)}
          />
        )}
        {tab === 'notifications' && <Notifications token={token} />}
      </main>
    </div>
  );
}
