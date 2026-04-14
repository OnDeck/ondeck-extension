import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListShell } from '../components/ListShell';
import { FilterBar } from '../components/FilterBar';
import { QuickActions } from '../components/QuickActions';
import { getStoredAuth } from '../../lib/auth';
import {
  searchIssues,
  GitHubApiError,
  type IssueSearchItem,
  type Viewer,
} from '../../lib/github-api';
import { openInNewTab, ownerRepoFromIssueUrl, relativeTime } from '../../lib/format';
import { applyFilter, availableRepos, EMPTY_FILTER, type FilterState } from '../filters';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error' | 'empty';

function statusBadge(item: IssueSearchItem): { label: string; className: string } {
  const draft = item.draft || item.pull_request?.draft;
  if (draft) {
    return {
      label: 'Draft',
      className: 'border-gh-border-muted text-gh-fg-muted',
    };
  }
  const changesRequested = item.labels?.some((l) =>
    /changes[- ]?requested/i.test(l.name),
  );
  if (changesRequested) {
    return {
      label: 'Changes',
      className: 'border-gh-attention-emphasis text-gh-attention-emphasis',
    };
  }
  if (item.state === 'closed') {
    return {
      label: 'Closed',
      className: 'border-gh-done-emphasis text-gh-done-emphasis',
    };
  }
  return {
    label: 'Open',
    className: 'border-gh-success-emphasis text-gh-success-emphasis',
  };
}

function parseOwnerRepoNumber(item: IssueSearchItem): [string, string, number] | null {
  const m = item.repository_url.match(/\/repos\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return [m[1], m[2], item.number];
}

export function AssignedPrsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<IssueSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const { token } = await getStoredAuth();
    if (!token) {
      setStatus('error');
      setError('You are signed out.');
      return;
    }
    try {
      const results = await searchIssues(
        `is:pr is:open assignee:${viewer.login}`,
        token,
      );
      setItems(results);
      setStatus(results.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load assigned PRs',
      );
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);
  const repoOptions = useMemo(() => availableRepos(items), [items]);
  const listStatus: Status =
    status === 'ready' && filtered.length === 0 ? 'empty' : status;

  return (
    <div className="flex h-full flex-col">
      {status === 'ready' && items.length > 0 && (
        <FilterBar value={filter} onChange={setFilter} repoOptions={repoOptions} />
      )}
      <ListShell
        title="Assigned PRs"
        onRefresh={() => void load()}
        busy={status === 'loading'}
        status={listStatus}
        error={error}
        emptyMessage={
          items.length === 0
            ? 'No open PRs are assigned to you right now.'
            : 'Nothing matches your filters.'
        }
      >
        {filtered.map((item) => {
          const badge = statusBadge(item);
          const parsed = parseOwnerRepoNumber(item);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2"
            >
              <button
                type="button"
                onClick={() => openInNewTab(item.html_url)}
                className="flex flex-col gap-1 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-xs font-semibold text-gh-fg-default">
                    {item.title}
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wide ' +
                      badge.className
                    }
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {ownerRepoFromIssueUrl(item.repository_url)}#{item.number}
                  </span>
                  <span>{relativeTime(item.updated_at)}</span>
                </div>
              </button>
              {parsed && (
                <QuickActions
                  owner={parsed[0]}
                  repo={parsed[1]}
                  number={parsed[2]}
                  isPullRequest
                />
              )}
            </div>
          );
        })}
      </ListShell>
    </div>
  );
}
