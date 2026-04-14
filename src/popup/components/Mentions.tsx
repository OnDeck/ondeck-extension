import { searchMentions } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { EmptyState, ErrorState, Spinner } from './States';
import { IssueRow } from './IssueRow';

interface Props {
  token: string;
  login: string;
}

export function Mentions({ token, login }: Props) {
  const query = useGitHubQuery(() => searchMentions(token, login), [token, login]);

  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No active mentions"
        hint="Issues and PRs where you were @mentioned will show up here."
      />
    );
  }

  return (
    <div>
      {items.map((item) => (
        <IssueRow
          key={item.id}
          item={item}
          subtitle={<span>by @{item.user.login}</span>}
        />
      ))}
    </div>
  );
}
