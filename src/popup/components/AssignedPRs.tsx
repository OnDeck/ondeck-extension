import { searchAssignedPrs } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { EmptyState, ErrorState, Spinner } from './States';
import { IssueRow } from './IssueRow';

interface Props {
  token: string;
  login: string;
}

export function AssignedPRs({ token, login }: Props) {
  const query = useGitHubQuery(() => searchAssignedPrs(token, login), [token, login]);

  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No assigned PRs"
        hint="Open pull requests assigned to you will show up here."
      />
    );
  }

  return (
    <div>
      {items.map((item) => (
        <IssueRow key={item.id} item={item} />
      ))}
    </div>
  );
}
