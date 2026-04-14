import { useCallback, useEffect, useState } from 'react';
import { ListShell } from '../components/ListShell';
import { getStoredAuth } from '../../lib/auth';
import {
  searchIssues,
  GitHubApiError,
  type IssueSearchItem,
  type Viewer,
} from '../../lib/github-api';
import { openInNewTab, ownerRepoFromIssueUrl, relativeTime } from '../../lib/format';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error' | 'empty';

function mentionSnippet(body: string | null | undefined, login: string): string {
  if (!body) return '';
  const flat = body.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const idx = flat.toLowerCase().indexOf(`@${login.toLowerCase()}`);
  if (idx === -1) {
    return flat.length > 120 ? `${flat.slice(0, 120).trim()}…` : flat;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(flat.length, idx + 80);
  const prefix = start === 0 ? '' : '…';
  const suffix = end === flat.length ? '' : '…';
  return `${prefix}${flat.slice(start, end).trim()}${suffix}`;
}

function kindLabel(item: IssueSearchItem): 'PR' | 'Issue' {
  return item.pull_request ? 'PR' : 'Issue';
}

export function MentionsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<IssueSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const { token } = await getStoredAuth();
    if (!token) {
      setStatus('error');
      setError('You are signed out.');
      return;
    }
    try {
      const results = await searchIssues(
        `is:open mentions:${viewer.login}`,
        token,
      );
      setItems(results);
      setStatus(results.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load mentions',
      );
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ListShell
      title="Mentions"
      onRefresh={() => void load()}
      busy={status === 'loading'}
      status={status}
      error={error}
      emptyMessage="No open threads mention you."
    >
      {items.map((item) => {
        const kind = kindLabel(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => openInNewTab(item.html_url)}
            className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition-colors hover:border-gh-accent-emphasis"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 truncate text-xs font-semibold text-gh-fg-default">
                {item.title}
              </div>
              <span
                className={
                  'shrink-0 rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wide ' +
                  (kind === 'PR'
                    ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                    : 'border-gh-border-muted text-gh-fg-muted')
                }
              >
                {kind}
              </span>
            </div>
            <div className="line-clamp-2 text-[11px] text-gh-fg-default/80">
              {mentionSnippet(item.body, viewer.login)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
              <span className="truncate">
                {ownerRepoFromIssueUrl(item.repository_url)}#{item.number}
              </span>
              <span>{relativeTime(item.updated_at)}</span>
            </div>
          </button>
        );
      })}
    </ListShell>
  );
}
