import { searchReviewRequested, type IssueSearchItem } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { EmptyState, ErrorState, Spinner } from './States';
import { IssueRow } from './IssueRow';

interface Props {
  token: string;
  login: string;
}

function priorityLabel(item: IssueSearchItem): string | null {
  const blocking = item.labels.find((l) =>
    /(blocking|urgent|priority|p0|p1|hotfix)/i.test(l.name),
  );
  return blocking?.name ?? null;
}

export function Reviews({ token, login }: Props) {
  const query = useGitHubQuery(() => searchReviewRequested(token, login), [token, login]);

  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending reviews"
        hint="PRs where you're a requested reviewer will show up here."
      />
    );
  }

  return (
    <div>
      {items.map((item) => {
        const priority = priorityLabel(item);
        return (
          <IssueRow
            key={item.id}
            item={item}
            subtitle={
              <span className="flex items-center gap-1">
                <img
                  src={item.user.avatar_url}
                  alt={item.user.login}
                  className="h-3 w-3 rounded-full border border-gh-border-muted"
                />
                @{item.user.login}
              </span>
            }
            trailing={
              priority ? (
                <span className="ml-2 shrink-0 rounded-full bg-gh-attention-emphasis/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-attention-emphasis">
                  {priority}
                </span>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}
