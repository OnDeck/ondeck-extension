import { useState } from 'react';
import { Filters, type FilterState } from './components/Filters';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    repo: '',
    label: '',
    range: 'any',
  });

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
      <Filters initial={filters} onChange={setFilters} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          Filters: <span className="font-mono">{JSON.stringify(filters)}</span>
        </div>
        <div className="mt-3">
          <QuickActions repo="dillan-03/github-chrome" issueNumber={1} />
        </div>
        <p className="mt-3 text-[11px] text-gh-fg-muted">
          Press <kbd className="rounded border border-gh-border-default px-1">⌘⇧G</kbd>{' '}
          (or <kbd className="rounded border border-gh-border-default px-1">Ctrl+Shift+G</kbd>)
          to reopen this popup.
        </p>
      </main>
    </div>
  );
}
