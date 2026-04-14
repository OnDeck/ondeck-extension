import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPullRequestDetail,
  searchIssues,
  type GitHubSearchItem,
} from '../../lib/github-api';
import { openInNewTab, ownerRepoFromUrl, relativeTime } from '../../lib/format';
import type { Viewer } from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

const BLOCKING_PATTERNS = [/blocking/i, /urgent/i, /priority:?\s*high/i, /\bp0\b/i];

function isBlocking(item: GitHubSearchItem): boolean {
  return item.labels.some((l) => BLOCKING_PATTERNS.some((p) => p.test(l.name)));
}

function splitOwnerRepo(htmlUrl: string): { owner: string; repo: string } | null {
  try {
    const [, owner, repo] = new URL(htmlUrl).pathname.split('/');
    if (owner && repo) return { owner, repo };
  } catch {
    // ignore
  }
  return null;
}

export function ReviewsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<GitHubSearchItem[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await searchIssues(
        `is:pr is:open review-requested:${viewer.login}`,
        token,
      );
      setItems(result);
      setFileCounts({});
      setStatus('ready');

      // Lazy-enrich with changed_files.
      for (const item of result) {
        const parsed = splitOwnerRepo(item.html_url);
        if (!parsed) continue;
        fetchPullRequestDetail(parsed.owner, parsed.repo, item.number, token)
          .then((detail) => {
            setFileCounts((prev) => ({ ...prev, [item.id]: detail.changed_files }));
          })
          .catch(() => {
            /* ignore per-row errors */
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading reviews…
      </div>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <div className="space-y-2 text-xs">
        <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-gh-danger-emphasis">
          {error ?? 'Something went wrong'}
        </div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="text-gh-fg-muted">{items.length} awaiting review</div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
          onClick={() => void load()}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-gh-fg-muted">
          No reviews requested.
        </div>
      ) : (
        <ul className="divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {items.map((item) => {
            const filesChanged = fileCounts[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-black/20"
                >
                  {item.user && (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.login}
                      className="mt-0.5 h-5 w-5 rounded-full border border-gh-border-default"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {isBlocking(item) && (
                        <span className="rounded-full bg-gh-danger-emphasis/20 px-2 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                          Blocking
                        </span>
                      )}
                      <span className="truncate text-gh-fg-default">{item.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                      <span className="truncate">
                        {ownerRepoFromUrl(item.html_url)}#{item.number}
                        {filesChanged !== undefined && ` · ${filesChanged} files`}
                      </span>
                      <span>{relativeTime(item.updated_at)}</span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
