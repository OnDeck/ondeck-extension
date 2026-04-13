import { useCallback, useEffect, useState } from 'react';
import {
  fetchMentions,
  GitHubApiError,
  repoSlugFromUrl,
  type MentionItem,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  viewer: Viewer;
}

function snippet(body: string | null, login: string): string | null {
  if (!body) return null;
  const flat = body.replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  const needle = `@${login}`;
  const idx = flat.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) {
    return flat.length > 120 ? `${flat.slice(0, 117)}…` : flat;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(flat.length, idx + 80);
  let out = flat.slice(start, end);
  if (start > 0) out = `…${out}`;
  if (end < flat.length) out = `${out}…`;
  return out;
}

function ageLabel(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function Mentions({ viewer }: Props) {
  const [items, setItems] = useState<MentionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not signed in', 0, 'unauthorized');
      }
      const data = await fetchMentions(token, viewer.login);
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
    <section className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-default px-4 py-2">
        <h2 className="text-xs font-semibold">Mentions</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {loading && !items && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">Loading…</p>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {items && items.length === 0 && !loading && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">No open mentions.</p>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-gh-border-muted">
          {items.map((item) => {
            const preview = snippet(item.body, viewer.login);
            return (
              <li key={item.id}>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full flex-col gap-1 px-4 py-2 hover:bg-gh-canvas-subtle"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gh-fg-muted">
                    <span className="truncate">
                      {repoSlugFromUrl(item.repository_url)} #{item.number}
                    </span>
                    <span>{ageLabel(item.updated_at)}</span>
                  </div>
                  <span className="truncate text-xs font-semibold text-gh-fg-default">
                    {item.title}
                  </span>
                  {preview && (
                    <span className="line-clamp-2 text-[11px] text-gh-fg-muted">
                      {preview}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
