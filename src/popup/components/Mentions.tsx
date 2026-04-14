import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchMentions,
  repoSlug,
  snippet,
  type MentionItem,
} from '../../lib/github-mentions';

interface Props {
  login: string;
}

type Status = 'loading' | 'ready' | 'error';

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function Mentions({ login }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<MentionItem[]>([]);
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
        const next = await fetchMentions(login, token);
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
        <h2 className="text-sm font-semibold text-gh-fg-default">Mentions</h2>
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
          No open mentions. Nice.
        </div>
      )}

      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-1 rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs font-medium text-gh-fg-default">
                  {item.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-gh-fg-muted">
                  {relativeAge(item.updated_at)}
                </span>
              </div>
              {item.body && (
                <p className="line-clamp-2 text-[11px] text-gh-fg-muted">
                  {snippet(item.body, login)}
                </p>
              )}
              <span className="text-[10px] text-gh-fg-muted">{repoSlug(item)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
