import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  GitHubApiError,
  repoFromIssue,
  searchIssues,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../lib/format';
import {
  applyFilter,
  EMPTY_FILTER,
  uniqueLabels,
  uniqueRepos,
  type FilterState,
} from '../lib/filters';
import { FilterBar } from './FilterBar';
import { QuickActions } from './QuickActions';

interface Props {
  viewer: Viewer;
}

type Status = 'Draft' | 'Open' | 'Closed';

function statusOf(item: SearchIssueItem): Status {
  if (item.state === 'closed') return 'Closed';
  if (item.draft) return 'Draft';
  return 'Open';
}

function statusClass(status: Status): string {
  switch (status) {
    case 'Draft':
      return 'border-gh-border-default text-gh-fg-muted';
    case 'Closed':
      return 'border-gh-danger-emphasis/60 text-gh-danger-emphasis';
    default:
      return 'border-gh-success-emphasis/60 text-gh-success-emphasis';
  }
}

export function AssignedPrsTab({ viewer }: Props) {
  const [items, setItems] = useState<SearchIssueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not authenticated', 0, 'unauthorized');
      const data = await searchIssues(
        `is:pr is:open assignee:${viewer.login}`,
        token,
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PRs');
    } finally {
      setLoading(false);
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const repos = useMemo(() => (items ? uniqueRepos(items) : []), [items]);
  const labels = useMemo(() => (items ? uniqueLabels(items) : []), [items]);
  const visible = useMemo(
    () => (items ? applyFilter(items, filter) : []),
    [items, filter],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gh-fg-muted">
          Assigned PRs
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {items && items.length > 0 && (
        <FilterBar filter={filter} repos={repos} labels={labels} onChange={setFilter} />
      )}

      {error && (
        <div className="rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {!error && !loading && items && items.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No PRs assigned to you. Inbox zero.
        </div>
      )}

      {items && items.length > 0 && visible.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No PRs match the current filter.
        </div>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const status = statusOf(item);
            return (
              <li key={item.id}>
                <div className="flex flex-col gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openInNewTab(item.html_url)}
                    className="flex flex-col gap-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-2 text-sm font-medium text-gh-fg-default">
                        {item.title}
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                      <span className="truncate">{repoFromIssue(item)}</span>
                      <span>{relativeTime(item.updated_at)}</span>
                    </div>
                  </button>
                  <QuickActions item={item} onMarkedReviewed={() => void load()} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {loading && !items && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          Loading…
        </div>
      )}
    </div>
  );
}
