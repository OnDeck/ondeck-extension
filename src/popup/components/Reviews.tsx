import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchReviewRequests,
  repoSlug,
  type ReviewItemDetailed,
} from '../../lib/github-reviews';

interface Props {
  login: string;
}

type Status = 'loading' | 'ready' | 'error';

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function Reviews({ login }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<ReviewItemDetailed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) throw new Error('Not signed in');
        const next = await fetchReviewRequests(login, token);
        if (cancelled) return;
        setItems(next);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [login, tick]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-gh-fg-default">Reviews requested</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="mx-4 mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
          No PRs awaiting your review.
        </div>
      )}

      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-2 rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle"
            >
              {item.user && (
                <img
                  src={item.user.avatar_url}
                  alt={item.user.login}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-xs font-medium text-gh-fg-default">
                    {item.title}
                  </span>
                  {item.blocking && (
                    <span className="shrink-0 rounded-md border border-gh-danger-emphasis px-1.5 py-[1px] text-[10px] font-semibold text-gh-danger-emphasis">
                      Blocking
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">{repoSlug(item)}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-2 font-mono">
                    {item.changedFiles !== null && (
                      <span title="Files changed">{item.changedFiles}f</span>
                    )}
                    <span>{relativeAge(item.updated_at)}</span>
                  </span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
