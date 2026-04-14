import { useState } from 'react';
import type { Viewer } from '../../lib/github-api';
import { useSearchIssues } from '../hooks/useSearchIssues';
import { FeedFilters, INITIAL_FILTERS, applyFilters, type FeedFilterState } from './FeedFilters';
import { FeedHeader } from './FeedHeader';
import { FeedList } from './FeedList';
import { FeedState } from './FeedState';
import { IssueListRow } from './IssueListRow';

interface Props {
  viewer: Viewer;
}

export function AssignedPrsTab({ viewer }: Props) {
  const query = `is:pr is:open assignee:${viewer.login}`;
  const { status, items, error, refresh } = useSearchIssues(query);
  const [filters, setFilters] = useState<FeedFilterState>(INITIAL_FILTERS);
  const filtered = applyFilters(items, filters);

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Assigned PRs"
        subtitle={`Open pull requests assigned to @${viewer.login}`}
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      <FeedFilters items={items} state={filters} onChange={setFilters} />
      {status === 'error' && (
        <FeedState
          status="error"
          message={error ?? 'Failed to load assigned PRs'}
          onRetry={refresh}
        />
      )}
      {status === 'ready' && items.length === 0 && (
        <FeedState status="empty" message="No open PRs assigned to you. 🎉" />
      )}
      {status === 'ready' && items.length > 0 && filtered.length === 0 && (
        <FeedState status="empty" message="No assigned PRs match those filters." />
      )}
      {status === 'loading' && items.length === 0 && (
        <FeedState status="loading" message="Loading assigned PRs…" />
      )}
      {filtered.length > 0 && (
        <FeedList>
          {filtered.map((item) => (
            <li key={item.id}>
              <IssueListRow item={item} resolveReviewStatus showQuickActions />
            </li>
          ))}
        </FeedList>
      )}
    </div>
  );
}
