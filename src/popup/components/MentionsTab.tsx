import { useCallback, useEffect, useState } from 'react';
import { fetchMentions, type MentionItem } from '../../lib/github-api';
import type { Viewer } from '../../lib/github-api';
import { getStoredToken } from '../../lib/auth';

interface Props {
  viewer: Viewer;
}

export function MentionsTab({ viewer }: Props) {
  const [items, setItems] = useState<MentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('Not signed in');
      setItems(await fetchMentions(token, viewer.login));
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
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Mentions
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {loading && !items && (
        <div className="mx-4 mt-3 text-xs text-gh-fg-muted">Loading…</div>
      )}

      {items && items.length === 0 && !loading && !error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No open mentions. You're all clear.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 px-2 pb-3">
          {items.map((m) => (
            <li key={m.id}>
              <a
                href={m.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle"
              >
                <div className="flex items-center gap-2">
                  <KindBadge kind={m.kind} />
                  <span className="truncate text-sm font-semibold text-gh-fg-default">
                    {m.title}
                  </span>
                </div>
                {m.body_snippet && (
                  <p className="line-clamp-2 text-[11px] text-gh-fg-muted">
                    {m.body_snippet}
                  </p>
                )}
                <div className="text-[11px] text-gh-fg-muted">
                  {m.org}/{m.repo} #{m.number} · {timeAgo(m.updated_at)}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: MentionItem['kind'] }) {
  const label = kind === 'pull_request' ? 'PR' : 'Issue';
  return (
    <span className="rounded-full border border-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
      {label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
