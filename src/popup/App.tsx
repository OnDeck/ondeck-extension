import { Header } from './components/Header';
import { Reviews } from './components/Reviews';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();

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
        <Reviews login={auth.viewer.login} />
      </main>
    </div>
  );
}
