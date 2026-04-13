import { useState } from 'react';
import { Header } from './components/Header';
import { Reviews } from './components/Reviews';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

type Tab = 'home' | 'reviews';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('reviews');

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
      <nav className="flex border-b border-gh-border-default text-xs">
        <button
          type="button"
          onClick={() => setTab('home')}
          className={`flex-1 px-3 py-2 ${
            tab === 'home'
              ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
              : 'text-gh-fg-muted hover:text-gh-fg-default'
          }`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setTab('reviews')}
          className={`flex-1 px-3 py-2 ${
            tab === 'reviews'
              ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
              : 'text-gh-fg-muted hover:text-gh-fg-default'
          }`}
        >
          Reviews
        </button>
      </nav>
      <main className="flex-1 overflow-y-auto">
        {tab === 'reviews' ? (
          <Reviews viewer={auth.viewer} />
        ) : (
          <div className="px-4 py-3">
            <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
              Signed in. Open the Reviews tab to see PRs awaiting your review.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
