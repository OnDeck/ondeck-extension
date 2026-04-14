import { useEffect, useState } from 'react';
import {
  fetchLatestReviewState,
  parseRepoFromUrl,
  type PullReviewState,
  type SearchIssueItem,
} from '../../lib/github-api';

/**
 * For each PR item, fetches the latest aggregated review state so the list
 * can show a "Changes Requested" or "Approved" badge. Network errors are
 * swallowed per-item — the basic open/draft badge is still shown as a fallback.
 */
export function usePrReviewStates(
  token: string | null,
  items: SearchIssueItem[],
): Map<number, PullReviewState | null> {
  const [state, setState] = useState<Map<number, PullReviewState | null>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!token || items.length === 0) {
      setState(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        items.map(async (item) => {
          if (!item.pull_request) return [item.id, null] as const;
          const repo = parseRepoFromUrl(item.repository_url);
          const [owner, name] = repo.split('/');
          if (!owner || !name) return [item.id, null] as const;
          try {
            const s = await fetchLatestReviewState(token, owner, name, item.number);
            return [item.id, s] as const;
          } catch {
            return [item.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setState(new Map(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [token, items]);

  return state;
}
