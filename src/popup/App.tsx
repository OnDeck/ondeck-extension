import { useState } from 'react';
import { DEFAULT_FILTERS, FilterBar, type Filters } from './components/FilterBar';
import { Header } from './components/Header';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

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
      <FilterBar filters={filters} onChange={setFilters} />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          <div className="font-semibold text-gh-fg-default">Quick actions ready</div>
          <ul className="mt-2 space-y-1 text-[11px]">
            <li>· Open with <kbd className="font-mono">Cmd+Shift+G</kbd> (<kbd className="font-mono">Ctrl+Shift+G</kbd> on Windows)</li>
            <li>· Filter by repo, label, date range (above)</li>
            <li>· Mark PR reviewed, react to comments, and save draft replies via the quick-actions API</li>
          </ul>
          {(filters.repo || filters.label || filters.dateRange !== 'any') && (
            <div className="mt-2 text-[11px] text-gh-accent-emphasis">
              Active: repo=&quot;{filters.repo || '*'}&quot;, label=&quot;
              {filters.label || '*'}&quot;, range={filters.dateRange}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
