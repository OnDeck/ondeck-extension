import { useCallback, useEffect, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import {
  GitHubApiError,
  parseRepoNwo,
  searchIssues,
  type SearchPullRequest,
  type Viewer,
} from '../../lib/github-api';
import { EmptyState, ErrorState, LoadingState, formatRelativeAge, openInNewTab } from './common';

interface Props {
  viewer: Viewer;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: SearchPullRequest[] }
  | { kind: 'error'; message: string };

type BadgeKind = 'open' | 'draft' | 'changes-requested';

function badgeFor(pr: SearchPullRequest): { kind: BadgeKind; label: string } {
  if (pr.draft) return { kind: 'draft', label: 'Draft' };
  const hasChangesRequested = pr.labels.some((label) =>
    /changes[-_ ]requested/i.test(label.name),
  );
  if (hasChangesRequested) {
    return { kind: 'changes-requested', label: 'Changes Requested' };
  }
  return { kind: 'open', label: 'Open' };
}

function badgeClass(kind: BadgeKind): string {
  switch (kind) {
    case 'draft':
      return 'border-gh-border-default text-gh-fg-muted';
    case 'changes-requested':
      return 'border-gh-danger-emphasis text-gh-danger-emphasis';
    case 'open':
    default:
      return 'border-gh-success-emphasis text-gh-success-emphasis';
  }
}

export function AssignedPRsTab({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const token = await getStoredToken();
    if (!token) {
      setState({ kind: 'error', message: 'Not signed in' });
      return;
    }
    try {
      const query = `is:pr is:open assignee:${viewer.login}`;
      const res = await searchIssues(query, token);
      setState({ kind: 'ready', items: res.items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError ? err.message : 'Failed to load assigned PRs';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') return <LoadingState label="Loading assigned PRs…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.items.length === 0) {
    return (
      <EmptyState
        title="No assigned PRs"
        description="You have no open pull requests assigned to you."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-muted px-4 py-2">
        <span className="text-[11px] text-gh-fg-muted">
          {state.items.length} assigned PR{state.items.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] text-gh-accent-emphasis hover:underline"
        >
          Refresh
        </button>
      </div>
      <ul className="divide-y divide-gh-border-muted">
        {state.items.map((pr) => {
          const badge = badgeFor(pr);
          const repo = parseRepoNwo(pr.repository_url);
          return (
            <li key={pr.id}>
              <button
                type="button"
                onClick={() => openInNewTab(pr.html_url)}
                className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-gh-canvas-subtle"
              >
                <div className="flex w-full items-center gap-2">
                  <span className="truncate text-sm text-gh-fg-default">{pr.title}</span>
                </div>
                <div className="flex w-full items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {repo} #{pr.number}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ' +
                        badgeClass(badge.kind)
                      }
                    >
                      {badge.label}
                    </span>
                    <span>{formatRelativeAge(pr.updated_at)}</span>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
