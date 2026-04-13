import { useCallback, useEffect, useState } from 'react';
import {
  fetchAssignedPrs,
  GitHubApiError,
  repoSlugFromUrl,
  type IssueSearchItem,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  viewer: Viewer;
}

function ageLabel(iso: string): string {
  const updated = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - updated);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

interface BadgeProps {
  item: IssueSearchItem;
}

function StatusBadge({ item }: BadgeProps) {
  const changesRequested = item.labels.some(
    (l) => l.name.toLowerCase() === 'changes requested',
  );
  let label = 'Open';
  let cls = 'border-gh-success-emphasis text-gh-success-emphasis';
  if (item.draft) {
    label = 'Draft';
    cls = 'border-gh-fg-muted text-gh-fg-muted';
  } else if (changesRequested) {
    label = 'Changes requested';
    cls = 'border-gh-danger-emphasis text-gh-danger-emphasis';
  }
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export function AssignedPrs({ viewer }: Props) {
  const [items, setItems] = useState<IssueSearchItem[] | null>(null);
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
      const data = await fetchAssignedPrs(token, viewer.login);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PRs');
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
        <h2 className="text-xs font-semibold">Assigned PRs</h2>
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
        <p className="px-4 py-3 text-xs text-gh-fg-muted">
          No PRs assigned to you. Nice work.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-gh-border-muted">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex w-full flex-col gap-1 px-4 py-2 hover:bg-gh-canvas-subtle"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-xs font-semibold text-gh-fg-default">
                    {item.title}
                  </span>
                  <StatusBadge item={item} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {repoSlugFromUrl(item.repository_url)} #{item.number}
                  </span>
                  <span>{ageLabel(item.updated_at)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
