import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPullRequestChangedFiles,
  fetchReviewRequests,
  GitHubApiError,
  parseRepoSlug,
  type ReviewRequestItem,
  type Viewer,
} from '../../lib/github-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: ReviewRequestItem[] }
  | { kind: 'error'; message: string };

interface Props {
  viewer: Viewer;
}

function formatAge(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

export function Reviews({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState({ kind: 'error', message: 'Not signed in' });
        return;
      }
      const items = await fetchReviewRequests(viewer.login, token);
      setState({ kind: 'ready', items });

      // Lazily enrich with changed_files counts. Failures are ignored per row
      // so the list stays useful even if rate-limited.
      await Promise.all(
        items.map(async (item) => {
          try {
            const repo = parseRepoSlug(item.repository_url);
            const changed = await fetchPullRequestChangedFiles(
              repo,
              item.number,
              token,
            );
            setState((prev) => {
              if (prev.kind !== 'ready') return prev;
              return {
                kind: 'ready',
                items: prev.items.map((it) =>
                  it.id === item.id ? { ...it, changed_files: changed } : it,
                ),
              };
            });
          } catch {
            /* ignore */
          }
        }),
      );
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load review requests';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-gh-fg-default">Reviews requested</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state.kind === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading review requests…
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="text-xs text-gh-danger-emphasis">{state.message}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' && state.items.length === 0 && (
        <div className="mx-4 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          No PRs waiting on your review.
        </div>
      )}

      {state.kind === 'ready' && state.items.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {state.items.map((item) => {
            const repo = parseRepoSlug(item.repository_url);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full items-start gap-3 border-b border-gh-border-muted px-4 py-2.5 text-left hover:bg-gh-canvas-subtle"
                >
                  {item.user?.avatar_url ? (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.login}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                    />
                  ) : (
                    <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default bg-gh-canvas-subtle" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.isBlocking && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-gh-danger-emphasis px-1.5 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                          Blocking
                        </span>
                      )}
                      <span className="truncate text-[11px] text-gh-fg-muted">
                        {repo} #{item.number}
                        {item.user ? ` · @${item.user.login}` : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gh-fg-default">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gh-fg-muted">
                      {item.changed_files == null
                        ? '… files'
                        : `${item.changed_files} file${item.changed_files === 1 ? '' : 's'} changed`}
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-[11px] text-gh-fg-muted">
                    {formatAge(item.updated_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
