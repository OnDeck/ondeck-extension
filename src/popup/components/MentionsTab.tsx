import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchMentions,
  repoSlugFromRepositoryUrl,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function snippet(body: string | null, login: string): string {
  if (!body) return '';
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) {
    return body.slice(0, 120) + (body.length > 120 ? '…' : '');
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + needle.length + 80);
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
}

export function MentionsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const results = await fetchMentions(viewer.login, token);
      setItems(results);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (item: SearchIssueItem) => {
    const url = item.pull_request?.html_url ?? item.html_url;
    chrome.tabs?.create({ url });
  };

  if (status === 'loading') {
    return <div className="p-3 text-center text-xs text-gh-fg-muted">Loading mentions…</div>;
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
        No open mentions.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => open(item)}
            className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-left hover:border-gh-accent-emphasis"
          >
            <div className="truncate text-xs font-medium text-gh-fg-default">{item.title}</div>
            <div className="line-clamp-2 text-[11px] text-gh-fg-muted">
              {snippet(item.body, viewer.login)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
              <span className="truncate">{repoSlugFromRepositoryUrl(item.repository_url)}</span>
              <span>{timeAgo(item.updated_at)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
