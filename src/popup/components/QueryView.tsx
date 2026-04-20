import type { ReactNode } from 'react';
import type { QueryResult } from '../hooks/useGitHubQuery';
import { EmptyState, ErrorState, Spinner } from './States';

interface Props<T> {
  query: QueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; hint?: string };
  children: (data: T) => ReactNode;
}

/**
 * Render-prop wrapper that handles the four states every list tab needs:
 * loading, error (with retry), empty, success. Lets each tab focus on the
 * shape of its own data and how rows render.
 */
export function QueryView<T>({ query, isEmpty, empty, children }: Props<T>) {
  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }
  const data = query.data;
  if (data == null) return <Spinner />;
  if (empty && isEmpty?.(data)) {
    return <EmptyState title={empty.title} hint={empty.hint} />;
  }
  return <>{children(data)}</>;
}
