import type { TabId } from '../types';
import { useDashboardCounts } from '../hooks/useDashboardCounts';

interface Props {
  login: string;
  onNavigate: (tab: TabId) => void;
}

interface Row {
  tab: TabId;
  label: string;
  getCount: (counts: { assignedPrs: number; reviewRequests: number; mentions: number; notifications: number }) => number;
}

const ROWS: Row[] = [
  { tab: 'assigned', label: 'Assigned PRs', getCount: (c) => c.assignedPrs },
  { tab: 'reviews', label: 'Review requests', getCount: (c) => c.reviewRequests },
  { tab: 'mentions', label: 'Mentions', getCount: (c) => c.mentions },
  { tab: 'notifications', label: 'Unread notifications', getCount: (c) => c.notifications },
];

export function Dashboard({ login, onNavigate }: Props) {
  const { status, counts, error, refresh } = useDashboardCounts(login);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Overview
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' ? (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis/40 bg-gh-danger-emphasis/10 p-3 text-xs text-gh-danger-emphasis">
          {error ?? 'Failed to load counts.'}
        </div>
      ) : null}

      <ul className="mt-2 flex-1 divide-y divide-gh-border-muted">
        {ROWS.map((row) => {
          const value = counts ? row.getCount(counts) : null;
          return (
            <li key={row.tab}>
              <button
                type="button"
                onClick={() => onNavigate(row.tab)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-gh-canvas-subtle"
              >
                <span className="text-sm text-gh-fg-default">{row.label}</span>
                <span className="flex items-center gap-2">
                  {status === 'loading' && value === null ? (
                    <span className="text-xs text-gh-fg-muted">…</span>
                  ) : (
                    <span
                      className={
                        value && value > 0
                          ? 'rounded-full bg-gh-accent-emphasis/20 px-2 py-0.5 text-xs font-semibold text-gh-accent-emphasis'
                          : 'rounded-full border border-gh-border-default px-2 py-0.5 text-xs text-gh-fg-muted'
                      }
                    >
                      {value ?? 0}
                    </span>
                  )}
                  <span className="text-gh-fg-muted">›</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {status === 'ready' && counts &&
        counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.notifications === 0 ? (
        <div className="px-4 pb-3 text-center text-xs text-gh-fg-muted">
          Inbox zero. Nothing needs your attention right now.
        </div>
      ) : null}
    </div>
  );
}
