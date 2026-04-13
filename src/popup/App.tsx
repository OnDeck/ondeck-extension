import { useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import {
  applyFilters,
  DEFAULT_FILTER_STATE,
  type FilterState,
} from '../lib/filters';

type Tab = 'home' | 'actions';

// A tiny demo dataset so the FilterBar has something to filter against in
// this branch. Once the list tabs ship, each tab will pass its own data.
const DEMO_ITEMS = [
  {
    id: 1,
    title: 'Bump dependencies',
    repository: { full_name: 'octo/cat' },
    labels: [{ name: 'chore' }],
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    title: 'Fix flaky test',
    repository: { full_name: 'octo/cat' },
    labels: [{ name: 'bug' }],
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    title: 'New onboarding flow',
    repository: { full_name: 'octo/web' },
    labels: [{ name: 'feature' }],
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('actions');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const repos = useMemo(
    () => Array.from(new Set(DEMO_ITEMS.map((i) => i.repository.full_name))).sort(),
    [],
  );
  const labels = useMemo(
    () =>
      Array.from(
        new Set(DEMO_ITEMS.flatMap((i) => i.labels.map((l) => l.name))),
      ).sort(),
    [],
  );
  const filtered = useMemo(() => applyFilters(DEMO_ITEMS, filters), [filters]);

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
          onClick={() => setTab('actions')}
          className={`flex-1 px-3 py-2 ${
            tab === 'actions'
              ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
              : 'text-gh-fg-muted hover:text-gh-fg-default'
          }`}
        >
          Quick actions
        </button>
      </nav>
      <main className="flex-1 overflow-y-auto">
        {tab === 'actions' ? (
          <QuickActions />
        ) : (
          <>
            <FilterBar
              state={filters}
              repos={repos}
              labels={labels}
              onChange={setFilters}
            />
            <ul className="divide-y divide-gh-border-muted">
              {filtered.map((item) => (
                <li key={item.id} className="px-4 py-2 text-xs">
                  <div className="font-semibold text-gh-fg-default">{item.title}</div>
                  <div className="text-[11px] text-gh-fg-muted">
                    {item.repository.full_name} · {item.labels.map((l) => l.name).join(', ')}
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-xs text-gh-fg-muted">
                  No items match the current filters.
                </li>
              )}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
