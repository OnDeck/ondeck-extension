import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { searchIssues, type GitHubSearchItem } from '../../lib/github-api';
import { openInNewTab, ownerRepoFromUrl, relativeTime } from '../../lib/format';
import type { Viewer } from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

function buildSnippet(item: GitHubSearchItem, login: string): string {
  const body = (item.body ?? '').replace(/\r\n/g, '\n').trim();
  if (!body) return '';
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  const MAX = 140;
  if (idx === -1) {
    return body.length > MAX ? `${body.slice(0, MAX).trimEnd()}…` : body;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + needle.length + 80);
  const snippet = body.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${snippet}${end < body.length ? '…' : ''}`;
}

export function MentionsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<GitHubSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await searchIssues(`is:open mentions:${viewer.login}`, token);
      setItems(result);
      setStatus('ready');
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
        Loading mentions…
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
        <div className="text-gh-fg-muted">{items.length} mentions</div>
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
          No open mentions.
        </div>
      ) : (
        <ul className="divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {items.map((item) => {
            const isPr = Boolean(item.pull_request);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-black/20"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                        (isPr
                          ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                          : 'bg-gh-done-emphasis/20 text-gh-done-emphasis')
                      }
                    >
                      {isPr ? 'PR' : 'Issue'}
                    </span>
                    <span className="truncate text-gh-fg-default">{item.title}</span>
                  </div>
                  <div className="line-clamp-2 text-[11px] text-gh-fg-muted">
                    {buildSnippet(item, viewer.login) || 'No description'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                    <span className="truncate">
                      {ownerRepoFromUrl(item.html_url)}#{item.number}
                    </span>
                    <span>{relativeTime(item.updated_at)}</span>
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
