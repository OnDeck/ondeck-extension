import { useCallback, useEffect, useState } from 'react';
import {
  fetchPullRequestChangedFiles,
  fetchReviewRequests,
  GitHubApiError,
  isBlockingPriority,
  repoSlugFromUrl,
  type ReviewRequestItem,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  viewer: Viewer;
}

function ageLabel(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

interface Enriched extends ReviewRequestItem {
  changedFiles: number | null;
}

export function Reviews({ viewer }: Props) {
  const [items, setItems] = useState<Enriched[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not signed in', 0, 'unauthorized');
      }
      const list = await fetchReviewRequests(token, viewer.login);
      // Hydrate the visible slice with changed-files counts in parallel.
      const head = list.slice(0, 20);
      const enrichedHead = await Promise.all(
        head.map(async (item) => {
          const changedFiles = item.pull_request
            ? await fetchPullRequestChangedFiles(token, item.pull_request.url)
            : null;
          return { ...item, changedFiles };
        }),
      );
      const tail: Enriched[] = list
        .slice(20)
        .map((item) => ({ ...item, changedFiles: null }));
      setItems([...enrichedHead, ...tail]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-default px-4 py-2">
        <h2 className="text-xs font-semibold">Reviews</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {loading && !items && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">Loading…</p>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {items && items.length === 0 && !loading && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">
          No reviews waiting on you.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-gh-border-muted">
          {items.map((item) => {
            const blocking = isBlockingPriority(item);
            return (
              <li key={item.id}>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle"
                >
                  {item.user && (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.login}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-xs font-semibold text-gh-fg-default">
                        {item.title}
                      </span>
                      {blocking && (
                        <span className="shrink-0 rounded-md border border-gh-danger-emphasis px-1.5 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                          Blocking
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                      <span className="truncate">
                        {repoSlugFromUrl(item.repository_url)} #{item.number}
                        {item.user ? ` · @${item.user.login}` : ''}
                      </span>
                      <span>
                        {item.changedFiles != null
                          ? `${item.changedFiles} files · `
                          : ''}
                        {ageLabel(item.updated_at)}
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
