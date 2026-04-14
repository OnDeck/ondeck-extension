import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const auth = useAuth();
  const theme = useTheme();

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-gh-canvas-default text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer) {
    return <SignIn auth={auth} />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-gh-canvas-default text-gh-fg-default">
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        themePreference={theme.preference}
        onThemeChange={(pref) => void theme.setPreference(pref)}
      />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          Signed in. Dashboard, assigned PRs, mentions, reviews, and notifications
          ship in subsequent tickets.
        </div>
      </main>
    </div>
  );
}
