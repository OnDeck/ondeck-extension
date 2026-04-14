import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchAssignedPullRequests,
  GitHubApiError,
  parseRepoSlug,
  type IssueSearchItem,
  type Viewer,
} from '../../lib/github-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: IssueSearchItem[] }
  | { kind: 'error'; message: string };

interface Props {
  viewer: Viewer;
}

function formatAge(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

type Status = 'draft' | 'changes-requested' | 'open';

function statusForItem(item: IssueSearchItem): Status {
  if (item.draft) return 'draft';
  const hasChangesRequested = item.labels.some(
    (l) => l.name.toLowerCase() === 'changes requested',
  );
  if (hasChangesRequested) return 'changes-requested';
  return 'open';
}

function StatusBadge({ status }: { status: Status }) {
  const { label, className } = (() => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          className: 'border-gh-fg-muted text-gh-fg-muted',
        };
      case 'changes-requested':
        return {
          label: 'Changes',
          className: 'border-gh-danger-emphasis text-gh-danger-emphasis',
        };
      default:
        return {
          label: 'Open',
          className: 'border-gh-success-emphasis text-gh-success-emphasis',
        };
    }
  })();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export function AssignedPrs({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState({ kind: 'error', message: 'Not signed in' });
        return;
      }
      const items = await fetchAssignedPullRequests(viewer.login, token);
      setState({ kind: 'ready', items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load assigned PRs';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInNewTab = (url: string) => {
    // chrome.tabs isn't available from popup without the "tabs" permission;
    // window.open works for the popup UX.
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-gh-fg-default">Assigned PRs</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state.kind === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading assigned PRs…
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="text-xs text-gh-danger-emphasis">{state.message}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' && state.items.length === 0 && (
        <div className="mx-4 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          No PRs assigned to you. Nice.
        </div>
      )}

      {state.kind === 'ready' && state.items.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {state.items.map((item) => {
            const repo = parseRepoSlug(item.repository_url);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openInNewTab(item.html_url)}
                  className="flex w-full items-start gap-3 border-b border-gh-border-muted px-4 py-2.5 text-left hover:bg-gh-canvas-subtle"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={statusForItem(item)} />
                      <span className="truncate text-[11px] text-gh-fg-muted">
                        {repo} #{item.number}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gh-fg-default">
                      {truncate(item.title, 80)}
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-[11px] text-gh-fg-muted">
                    {formatAge(item.updated_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
