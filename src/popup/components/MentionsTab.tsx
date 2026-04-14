import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  GitHubApiError,
  repoFromIssue,
  searchIssues,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../lib/format';

interface Props {
  viewer: Viewer;
}

function snippetAroundMention(body: string | null, login: string): string {
  if (!body) return '';
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) {
    return body.slice(0, 120).replace(/\s+/g, ' ').trim();
  }
  const start = Math.max(0, idx - 50);
  const end = Math.min(body.length, idx + needle.length + 70);
  let s = body.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '… ' + s;
  if (end < body.length) s = s + ' …';
  return s;
}

function targetType(item: SearchIssueItem): 'PR' | 'Issue' {
  return item.pull_request ? 'PR' : 'Issue';
}

export function MentionsTab({ viewer }: Props) {
  const [items, setItems] = useState<SearchIssueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not authenticated', 0, 'unauthorized');
      const data = await searchIssues(`is:open mentions:${viewer.login}`, token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mentions');
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
        <div className="text-xs uppercase tracking-wide text-gh-fg-muted">Mentions</div>
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
          No open mentions.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openInNewTab(item.html_url)}
                className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left hover:border-gh-accent-emphasis"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="line-clamp-2 text-sm font-medium text-gh-fg-default">
                    {item.title}
                  </div>
                  <span className="shrink-0 rounded-full border border-gh-border-default px-2 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
                    {targetType(item)}
                  </span>
                </div>
                <div className="line-clamp-2 text-[11px] italic text-gh-fg-muted">
                  {snippetAroundMention(item.body, viewer.login) || '(no body)'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">{repoFromIssue(item)}</span>
                  <span>{relativeTime(item.updated_at)}</span>
                </div>
              </button>
            </li>
          ))}
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
