import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPrReviewState,
  GitHubApiError,
  searchIssues,
  type GitHubPrItem,
  type PrReviewState,
} from '../../lib/github-api';

export type AssignedStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AssignedPrItem extends GitHubPrItem {
  reviewState: PrReviewState;
}

export interface UseAssignedPrs {
  status: AssignedStatus;
  items: AssignedPrItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads PRs assigned to the current viewer. After the list arrives we
 * kick off lightweight review-state fetches per-row so the "Changes
 * requested" badge can appear without blocking the initial render.
 */
export function useAssignedPrs(login: string | undefined): UseAssignedPrs {
  const [status, setStatus] = useState<AssignedStatus>('idle');
  const [items, setItems] = useState<AssignedPrItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!login) return;
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setStatus('error');
        setError('Not authenticated');
        return;
      }
      const query = `is:pr is:open assignee:${login}`;
      const prs = await searchIssues(token, query);
      const initial: AssignedPrItem[] = prs.map((p) => ({ ...p, reviewState: null }));
      setItems(initial);
      setStatus('ready');

      // Background-enrich with review states. Failures are swallowed
      // per row so one bad repo doesn't poison the whole list.
      void Promise.all(
        prs.map(async (pr) => {
          const state = await fetchPrReviewState(token, pr.org, pr.repo, pr.number);
          return { id: pr.id, state };
        }),
      ).then((states) => {
        const byId = new Map(states.map((s) => [s.id, s.state] as const));
        setItems((prev) =>
          prev.map((p) => ({ ...p, reviewState: byId.get(p.id) ?? p.reviewState })),
        );
      });
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load assigned PRs',
      );
    }
  }, [login]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, items, error, refresh: load };
}
