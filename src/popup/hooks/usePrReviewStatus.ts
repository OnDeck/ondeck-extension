import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { fetchPrReviewStatus, type PrReviewStatus } from '../../lib/github-api';

/**
 * Lazily resolve a PR's review decision. Returns null until the reviews
 * request finishes, so callers can show a fallback badge in the meantime.
 */
export function usePrReviewStatus(
  repoSlug: string,
  number: number,
  enabled = true,
): PrReviewStatus | null {
  const [status, setStatus] = useState<PrReviewStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) return;
        const next = await fetchPrReviewStatus(token, repoSlug, number);
        if (!cancelled) setStatus(next);
      } catch {
        // Swallow — the badge just falls back to "Open".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoSlug, number, enabled]);

  return status;
}
