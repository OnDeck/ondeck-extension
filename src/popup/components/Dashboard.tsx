import { useDashboardCounts } from '../hooks/useDashboardCounts';
import type { TabKey } from './TabNav';
import { StatusMessage } from './StatusMessage';

interface Props {
  active: boolean;
  onNavigate: (key: TabKey) => void;
}

interface Row {
  key: TabKey;
  label: string;
  description: string;
  countKey: 'assignedPrs' | 'mentions' | 'reviewRequests' | 'notifications';
}

const ROWS: Row[] = [
  {
    key: 'assigned',
    label: 'Assigned PRs',
    description: 'Pull requests waiting on you',
    countKey: 'assignedPrs',
  },
  {
    key: 'reviews',
    label: 'Review requests',
    description: 'PRs asking for your review',
    countKey: 'reviewRequests',
  },
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'Threads that @mention you',
    countKey: 'mentions',
  },
  {
    key: 'notifications',
    label: 'Unread notifications',
    description: 'Your GitHub inbox',
    countKey: 'notifications',
  },
];

export function Dashboard({ active, onNavigate }: Props) {
  const { status, counts, error, refresh } = useDashboardCounts(active);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Workflow
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'loading' && !counts && (
        <StatusMessage>Loading your workflow…</StatusMessage>
      )}

      {status === 'error' && !counts && (
        <StatusMessage tone="danger">{error ?? 'Failed to load counts'}</StatusMessage>
      )}

      {counts && (
        <ul className="flex flex-col divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {ROWS.map((row) => {
            const value = counts[row.countKey];
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(row.key)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gh-border-muted/40 focus:outline-none focus:ring-1 focus:ring-gh-accent-emphasis"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gh-fg-default">
                      {row.label}
                    </div>
                    <div className="truncate text-[11px] text-gh-fg-muted">
                      {row.description}
                    </div>
                  </div>
                  <span
                    className={`ml-3 inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      value > 0
                        ? 'bg-gh-accent-emphasis text-white'
                        : 'bg-gh-border-muted text-gh-fg-muted'
                    }`}
                  >
                    {value}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status === 'error' && counts && (
        <div className="text-[11px] text-gh-danger-emphasis">
          {error} — showing last known values.
        </div>
      )}
    </section>
  );
}
