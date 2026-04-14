import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPullRequestDetail,
  GitHubApiError,
  repoFromIssue,
  searchIssues,
  type PullRequestDetail,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../lib/format';

interface Props {
  viewer: Viewer;
}

const BLOCKING_LABELS = ['blocking', 'blocking deploy', 'priority:high', 'urgent', 'p0'];

function isBlocking(item: SearchIssueItem): boolean {
  return item.labels.some((l) =>
    BLOCKING_LABELS.includes(l.name.toLowerCase()),
  );
}

export function ReviewsTab({ viewer }: Props) {
  const [items, setItems] = useState<SearchIssueItem[] | null>(null);
  const [details, setDetails] = useState<Record<number, PullRequestDetail>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetails({});
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not authenticated', 0, 'unauthorized');
      const data = await searchIssues(
        `is:pr is:open review-requested:${viewer.login}`,
        token,
      );
      setItems(data);
      // Fetch details lazily in the background.
      void Promise.all(
        data.map(async (item) => {
          try {
            const repo = repoFromIssue(item);
            const detail = await fetchPullRequestDetail(repo, item.number, token);
            setDetails((prev) => ({ ...prev, [item.id]: detail }));
          } catch {
            // ignore per-item failures
          }
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review requests');
    } finally {
      setLoading(false);
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gh-fg-muted">
          Awaiting your review
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

      {error && (
        <div className="rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {!error && !loading && items && items.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No PRs awaiting your review.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const detail = details[item.id];
            const blocking = isBlocking(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left hover:border-gh-accent-emphasis"
                >
                  {item.user && (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.login}
                      className="h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-2 text-sm font-medium text-gh-fg-default">
                        {item.title}
                      </div>
                      {blocking && (
                        <span className="shrink-0 rounded-full border border-gh-danger-emphasis/60 px-2 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                          Blocking
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                      <span className="truncate">
                        {repoFromIssue(item)}#{item.number}
                      </span>
                      <span>
                        {detail ? `${detail.changed_files} files · ` : ''}
                        {relativeTime(item.updated_at)}
                      </span>
                    </div>
                  </div>
                </button>
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
