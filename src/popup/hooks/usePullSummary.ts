import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { fetchPullSummary, type PullSummary } from '../../lib/github-api';

export function usePullSummary(
  repoSlug: string,
  number: number,
  enabled = true,
): PullSummary | null {
  const [summary, setSummary] = useState<PullSummary | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) return;
        const next = await fetchPullSummary(token, repoSlug, number);
        if (!cancelled) setSummary(next);
      } catch {
        // Ignore — the files-changed indicator just stays hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoSlug, number, enabled]);

  return summary;
}
