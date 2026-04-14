import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import {
  GitHubApiError,
  fetchPullRequestDetail,
  parseRepoNwo,
  searchIssues,
  type PullRequestDetail,
  type SearchPullRequest,
  type Viewer,
} from '../../lib/github-api';
import { recordReview } from '../../lib/stats';
import { useDismissed } from '../hooks/useDismissed';
import { EmptyState, ErrorState, LoadingState, formatRelativeAge, openInNewTab } from './common';
import {
  FilterBar,
  INITIAL_FILTERS,
  applyFilters,
  deriveLabelOptions,
  deriveRepoOptions,
  type Filters,
} from './FilterBar';

interface Props {
  viewer: Viewer;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: SearchPullRequest[] }
  | { kind: 'error'; message: string };

const BLOCKING_LABEL_PATTERNS = [
  /blocking[-_ ]deploy/i,
  /blocks[-_ ]deploy/i,
  /priority[-_ :]high/i,
  /^urgent$/i,
  /^p0$/i,
  /^p1$/i,
];

function isBlocking(pr: SearchPullRequest): boolean {
  return pr.labels.some((label) =>
    BLOCKING_LABEL_PATTERNS.some((pattern) => pattern.test(label.name)),
  );
}

export function ReviewsTab({ viewer }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [details, setDetails] = useState<Record<number, PullRequestDetail>>({});
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const dismissed = useDismissed('reviews');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setDetails({});
    const token = await getStoredToken();
    if (!token) {
      setState({ kind: 'error', message: 'Not signed in' });
      return;
    }
    try {
      const query = `is:pr is:open review-requested:${viewer.login}`;
      const res = await searchIssues(query, token);
      setState({ kind: 'ready', items: res.items });
      for (const item of res.items) {
        const pullUrl = item.pull_request?.url;
        if (!pullUrl) continue;
        void fetchPullRequestDetail(pullUrl, token)
          .then((detail) => {
            setDetails((prev) => ({ ...prev, [item.id]: detail }));
          })
          .catch(() => undefined);
      }
    } catch (err) {
      const message =
        err instanceof GitHubApiError ? err.message : 'Failed to load review requests';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (state.kind !== 'ready') return [] as SearchPullRequest[];
    const notDismissed = state.items.filter((pr) => !dismissed.isDismissed(pr.id));
    return applyFilters(notDismissed, filters);
  }, [state, filters, dismissed]);

  if (state.kind === 'loading') return <LoadingState label="Loading reviews…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const repos = deriveRepoOptions(state.items);
  const labels = deriveLabelOptions(state.items);

  return (
    <div className="flex h-full flex-col">
      <FilterBar filters={filters} onChange={setFilters} repos={repos} labels={labels} />
      <div className="flex items-center justify-between border-b border-gh-border-muted px-4 py-2">
        <span className="text-[11px] text-gh-fg-muted">
          {visible.length} pending review{visible.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] text-gh-accent-emphasis hover:underline"
        >
          Refresh
        </button>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title="No pending reviews"
          description="Nothing is waiting on your review right now."
        />
      ) : (
        <ul className="divide-y divide-gh-border-muted">
          {visible.map((pr) => {
            const repo = parseRepoNwo(pr.repository_url);
            const detail = details[pr.id];
            const author = pr.user ?? detail?.user ?? null;
            const blocking = isBlocking(pr);
            return (
              <li
                key={pr.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gh-canvas-subtle"
              >
                {author && (
                  <img
                    src={author.avatar_url}
                    alt={author.login}
                    className="mt-0.5 h-6 w-6 flex-none rounded-full border border-gh-border-default"
                  />
                )}
                <button
                  type="button"
                  onClick={() => openInNewTab(pr.html_url)}
                  className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-gh-fg-default">{pr.title}</span>
                    {blocking && (
                      <span className="flex-none rounded-md border border-gh-danger-emphasis px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gh-danger-emphasis">
                        Blocking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                    <span className="truncate">
                      {repo} #{pr.number}
                    </span>
                    <span className="flex items-center gap-2">
                      <span>{detail ? `${detail.changed_files} files` : '— files'}</span>
                      <span>{formatRelativeAge(pr.updated_at)}</span>
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  title="Mark as reviewed (hides from list)"
                  onClick={() => {
                    void dismissed.dismiss(pr.id);
                    void recordReview(viewer.login);
                  }}
                  className="flex-none rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
                >
                  Reviewed
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
