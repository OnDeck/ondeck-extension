import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPrMetrics,
  GitHubApiError,
  searchIssues,
  type GitHubPrItem,
  type PrMetrics,
} from '../../lib/github-api';

export type ReviewsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ReviewRequestItem extends GitHubPrItem {
  metrics: PrMetrics | null;
}

export interface UseReviewRequests {
  status: ReviewsStatus;
  items: ReviewRequestItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads PRs where the viewer is a requested reviewer. After the list
 * arrives we background-fetch /repos/:o/:r/pulls/:n for each item to
 * enrich with `changed_files` so the reviewer can see the blast radius
 * without clicking through.
 */
export function useReviewRequests(login: string | undefined): UseReviewRequests {
  const [status, setStatus] = useState<ReviewsStatus>('idle');
  const [items, setItems] = useState<ReviewRequestItem[]>([]);
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
      const query = `is:pr is:open review-requested:${login}`;
      const prs = await searchIssues(token, query);
      setItems(prs.map((p) => ({ ...p, metrics: null })));
      setStatus('ready');

      void Promise.all(
        prs.map(async (pr) => ({
          id: pr.id,
          metrics: await fetchPrMetrics(token, pr.org, pr.repo, pr.number),
        })),
      ).then((pairs) => {
        const byId = new Map(pairs.map((p) => [p.id, p.metrics] as const));
        setItems((prev) =>
          prev.map((item) => ({ ...item, metrics: byId.get(item.id) ?? item.metrics })),
        );
      });
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load review requests',
      );
    }
  }, [login]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, items, error, refresh: load };
}
