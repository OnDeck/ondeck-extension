import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchMentions,
  GitHubApiError,
  parseRepoSlug,
  type IssueSearchItem,
  type Viewer,
} from '../../lib/github-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: IssueSearchItem[] }
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

function snippet(body: string | null, login: string): string | null {
  if (!body) return null;
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) {
    return body.length > 120 ? `${body.slice(0, 119)}…` : body;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < body.length ? '…' : '';
  return `${prefix}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export function Mentions({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState({ kind: 'error', message: 'Not signed in' });
        return;
      }
      const items = await fetchMentions(viewer.login, token);
      setState({ kind: 'ready', items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load mentions';
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
        <h2 className="text-sm font-semibold text-gh-fg-default">Mentions</h2>
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
          Loading mentions…
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
          No mentions. You're off the hook.
        </div>
      )}

      {state.kind === 'ready' && state.items.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {state.items.map((item) => {
            const repo = parseRepoSlug(item.repository_url);
            const snip = snippet(item.body, viewer.login);
            const isPr = Boolean(item.pull_request);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full items-start gap-3 border-b border-gh-border-muted px-4 py-2.5 text-left hover:bg-gh-canvas-subtle"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex shrink-0 items-center rounded-full border border-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
                        {isPr ? 'PR' : 'Issue'}
                      </span>
                      <span className="truncate text-[11px] text-gh-fg-muted">
                        {repo} #{item.number}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gh-fg-default">
                      {item.title}
                    </div>
                    {snip && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-gh-fg-muted">
                        {snip}
                      </div>
                    )}
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
