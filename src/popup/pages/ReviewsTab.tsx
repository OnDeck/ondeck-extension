import { useCallback, useEffect, useState } from 'react';
import { ListShell } from '../components/ListShell';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPullRequestDetail,
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

const BLOCKING_LABELS = /^(blocking|urgent|priority:high|p0|blocker)$/i;

function isBlocking(item: IssueSearchItem): boolean {
  return item.labels?.some((l) => BLOCKING_LABELS.test(l.name)) ?? false;
}

function parseOwnerRepoNumber(item: IssueSearchItem): [string, string, number] | null {
  const match = item.repository_url.match(/\/repos\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return [match[1], match[2], item.number];
}

export function ReviewsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<IssueSearchItem[]>([]);
  const [files, setFiles] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setFiles({});
    const { token } = await getStoredAuth();
    if (!token) {
      setStatus('error');
      setError('You are signed out.');
      return;
    }
    try {
      const results = await searchIssues(
        `is:pr is:open review-requested:${viewer.login}`,
        token,
      );
      setItems(results);
      setStatus(results.length === 0 ? 'empty' : 'ready');

      // Lazy-enrich with changed_files count.
      for (const item of results) {
        const parsed = parseOwnerRepoNumber(item);
        if (!parsed) continue;
        const [owner, repo, num] = parsed;
        fetchPullRequestDetail(owner, repo, num, token)
          .then((detail) => {
            setFiles((prev) => ({ ...prev, [item.id]: detail.changed_files }));
          })
          .catch(() => {
            // Non-fatal: skip file count for this row.
          });
      }
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load review requests',
      );
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ListShell
      title="Review Requests"
      onRefresh={() => void load()}
      busy={status === 'loading'}
      status={status}
      error={error}
      emptyMessage="No pending review requests. Nice work."
    >
      {items.map((item) => {
        const blocking = isBlocking(item);
        const fileCount = files[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => openInNewTab(item.html_url)}
            className="flex w-full items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition-colors hover:border-gh-accent-emphasis"
          >
            {item.user && (
              <img
                src={item.user.avatar_url}
                alt={item.user.login}
                className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-muted"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 truncate text-xs font-semibold text-gh-fg-default">
                  {item.title}
                </div>
                {blocking && (
                  <span className="shrink-0 rounded-full border border-gh-danger-emphasis px-2 text-[10px] font-semibold uppercase tracking-wide text-gh-danger-emphasis">
                    Blocking
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                <span className="truncate">
                  {ownerRepoFromIssueUrl(item.repository_url)}#{item.number}
                  {item.user ? ` · @${item.user.login}` : ''}
                </span>
                <span>
                  {fileCount != null ? `${fileCount} files · ` : ''}
                  {relativeTime(item.updated_at)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </ListShell>
  );
}
