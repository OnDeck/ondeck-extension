import { useDashboardCounts } from '../hooks/useDashboardCounts';
import type { Viewer } from '../../lib/github-api';
import type { TabKey } from './TabBar';

interface Props {
  viewer: Viewer;
  token: string | null;
  onNavigate: (tab: TabKey) => void;
}

interface Row {
  key: TabKey;
  label: string;
  count: number | null;
}

export function Dashboard({ viewer, token, onNavigate }: Props) {
  const { counts, loading, error, refresh } = useDashboardCounts(token, viewer.login);

  const rows: Row[] = [
    { key: 'assigned', label: 'Assigned PRs', count: counts?.assigned ?? null },
    { key: 'reviews', label: 'Review requests', count: counts?.reviewRequested ?? null },
    { key: 'mentions', label: 'Mentions', count: counts?.mentions ?? null },
    { key: 'notifications', label: 'Unread notifications', count: counts?.notifications ?? null },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-gh-fg-muted">
          Overview
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-gh-danger-emphasis/50 bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      <ul className="flex flex-col overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
        {rows.map((row, idx) => (
          <li
            key={row.key}
            className={idx > 0 ? 'border-t border-gh-border-muted' : ''}
          >
            <button
              type="button"
              onClick={() => onNavigate(row.key)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gh-canvas-default"
            >
              <span>{row.label}</span>
              <span className="flex items-center gap-2">
                {loading && row.count === null ? (
                  <span className="text-xs text-gh-fg-muted">—</span>
                ) : (
                  <CountBadge value={row.count ?? 0} />
                )}
                <span aria-hidden className="text-gh-fg-muted">
                  ›
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!loading && !error && counts && allZero(counts) && (
        <div className="text-center text-xs text-gh-fg-muted">
          You're all caught up.
        </div>
      )}
    </div>
  );
}

function CountBadge({ value }: { value: number }) {
  const highlight = value > 0;
  return (
    <span
      className={
        'min-w-[24px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ' +
        (highlight
          ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
          : 'bg-gh-border-muted text-gh-fg-muted')
      }
    >
      {value}
    </span>
  );
}

function allZero(c: { assigned: number; reviewRequested: number; mentions: number; notifications: number }) {
  return c.assigned === 0 && c.reviewRequested === 0 && c.mentions === 0 && c.notifications === 0;
}
