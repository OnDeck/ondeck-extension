import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { GitHubApiError, searchIssues, type GitHubPrItem } from '../../lib/github-api';

export type MentionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseMentions {
  status: MentionsStatus;
  items: GitHubPrItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads issues / PRs where the viewer was @mentioned. Uses the search
 * API so we can target `mentions:{login}` rather than relying on the
 * notifications inbox (which also includes assignments, reviews, etc.).
 */
export function useMentions(login: string | undefined): UseMentions {
  const [status, setStatus] = useState<MentionsStatus>('idle');
  const [items, setItems] = useState<GitHubPrItem[]>([]);
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
      const query = `is:open mentions:${login}`;
      const results = await searchIssues(token, query);
      setItems(results);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load mentions',
      );
    }
  }, [login]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, items, error, refresh: load };
}
