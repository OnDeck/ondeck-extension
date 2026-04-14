import { useEffect, useState } from 'react';
import {
  fetchPullDetails,
  parseRepoFromUrl,
  type PullDetails,
  type SearchIssueItem,
} from '../../lib/github-api';

export function usePrDetails(
  token: string | null,
  items: SearchIssueItem[],
): Map<number, PullDetails | null> {
  const [state, setState] = useState<Map<number, PullDetails | null>>(
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
            const details = await fetchPullDetails(token, owner, name, item.number);
            return [item.id, details] as const;
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
