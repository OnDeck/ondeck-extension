import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPrChangedFiles,
  fetchReviewRequests,
  isBlockingPriority,
  repoSlugFromRepositoryUrl,
  type ReviewPrItem,
  type Viewer,
} from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function ReviewsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<ReviewPrItem[]>([]);
  const [filesByPr, setFilesByPr] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const results = await fetchReviewRequests(viewer.login, token);
      setItems(results);
      setStatus('ready');
      // Lazy-load changed-file counts in the background.
      const counts: Record<number, number> = {};
      await Promise.all(
        results.slice(0, 10).map(async (pr) => {
          const slug = repoSlugFromRepositoryUrl(pr.repository_url);
          const [owner, repo] = slug.split('/');
          if (!owner || !repo) return;
          try {
            counts[pr.id] = await fetchPrChangedFiles(owner, repo, pr.number, token);
          } catch {
            /* best-effort */
          }
        }),
      );
      setFilesByPr(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (pr: ReviewPrItem) => {
    const url = pr.pull_request?.html_url ?? pr.html_url;
    chrome.tabs?.create({ url });
  };

  if (status === 'loading' && items.length === 0) {
    return <div className="p-3 text-center text-xs text-gh-fg-muted">Loading reviews…</div>;
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-2 p-3 text-xs text-gh-danger-emphasis">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gh-border-default px-2 py-1 text-gh-fg-muted hover:border-gh-accent-emphasis"
        >
          Retry
        </button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
        No PRs awaiting your review.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((pr) => {
        const blocking = isBlockingPriority(pr.labels);
        const files = filesByPr[pr.id];
        return (
          <li key={pr.id}>
            <button
              type="button"
              onClick={() => open(pr)}
              className="flex w-full items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-left hover:border-gh-accent-emphasis"
            >
              {pr.user && (
                <img
                  src={pr.user.avatar_url}
                  alt={pr.user.login}
                  className="mt-0.5 h-6 w-6 rounded-full border border-gh-border-default"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  {blocking && (
                    <span className="rounded-full bg-gh-danger-emphasis/20 px-2 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                      Blocking
                    </span>
                  )}
                  <span className="truncate text-xs font-medium text-gh-fg-default">
                    {pr.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">{repoSlugFromRepositoryUrl(pr.repository_url)}</span>
                  <span>
                    {typeof files === 'number' ? `${files} file${files === 1 ? '' : 's'} · ` : ''}
                    {timeAgo(pr.updated_at)}
                  </span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
