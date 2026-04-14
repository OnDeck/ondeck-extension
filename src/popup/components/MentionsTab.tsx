import { useCallback, useEffect, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import {
  GitHubApiError,
  parseRepoNwo,
  searchIssues,
  type SearchPullRequest,
  type Viewer,
} from '../../lib/github-api';
import { EmptyState, ErrorState, LoadingState, formatRelativeAge, openInNewTab } from './common';

interface Props {
  viewer: Viewer;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: SearchPullRequest[] }
  | { kind: 'error'; message: string };

function snippet(body: string | null | undefined, login: string): string {
  if (!body) return '';
  const normalized = body.replace(/\r\n/g, '\n');
  const needle = `@${login}`;
  const idx = normalized.toLowerCase().indexOf(needle.toLowerCase());
  const start = Math.max(0, idx - 40);
  const end = Math.min(normalized.length, (idx === -1 ? 0 : idx) + 120);
  let text = normalized.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) text = '…' + text;
  if (end < normalized.length) text = text + '…';
  return text;
}

export function MentionsTab({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const token = await getStoredToken();
    if (!token) {
      setState({ kind: 'error', message: 'Not signed in' });
      return;
    }
    try {
      const query = `is:open mentions:${viewer.login}`;
      const res = await searchIssues(query, token);
      setState({ kind: 'ready', items: res.items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError ? err.message : 'Failed to load mentions';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') return <LoadingState label="Loading mentions…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.items.length === 0) {
    return <EmptyState title="No mentions" description="You haven't been @mentioned recently." />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-muted px-4 py-2">
        <span className="text-[11px] text-gh-fg-muted">
          {state.items.length} mention{state.items.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] text-gh-accent-emphasis hover:underline"
        >
          Refresh
        </button>
      </div>
      <ul className="divide-y divide-gh-border-muted">
        {state.items.map((item) => {
          const repo = parseRepoNwo(item.repository_url);
          const context = snippet(item.body, viewer.login);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openInNewTab(item.html_url)}
                className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-gh-canvas-subtle"
              >
                <span className="truncate text-sm text-gh-fg-default">{item.title}</span>
                {context && (
                  <span className="line-clamp-2 text-[11px] text-gh-fg-muted">{context}</span>
                )}
                <span className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {repo} #{item.number}
                  </span>
                  <span>{formatRelativeAge(item.updated_at)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
