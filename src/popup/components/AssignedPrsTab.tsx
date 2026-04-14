import type { Viewer } from '../../lib/github-api';
import { useSearchIssues } from '../hooks/useSearchIssues';
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

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Assigned PRs"
        subtitle={`Open pull requests assigned to @${viewer.login}`}
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      {status === 'error' && (
        <FeedState
          status="error"
          message={error ?? 'Failed to load assigned PRs'}
          onRetry={refresh}
        />
      )}
      {status !== 'error' && status !== 'idle' && items.length === 0 && status === 'ready' && (
        <FeedState
          status="empty"
          message="No open PRs assigned to you. 🎉"
        />
      )}
      {status === 'loading' && items.length === 0 && (
        <FeedState status="loading" message="Loading assigned PRs…" />
      )}
      {items.length > 0 && (
        <FeedList>
          {items.map((item) => (
            <li key={item.id}>
              <IssueListRow item={item} resolveReviewStatus />
            </li>
          ))}
        </FeedList>
      )}
    </div>
  );
}
