import { searchReviewRequested, type IssueSearchItem } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { Badge } from './Badge';
import { IssueRow } from './IssueRow';
import { QueryView } from './QueryView';

interface Props {
  token: string;
  login: string;
}

const PRIORITY_LABEL_RE = /(blocking|urgent|priority|p0|p1|hotfix)/i;

function priorityLabel(item: IssueSearchItem): string | null {
  return item.labels.find((l) => PRIORITY_LABEL_RE.test(l.name))?.name ?? null;
}

export function Reviews({ token, login }: Props) {
  const query = useGitHubQuery(() => searchReviewRequested(token, login), [token, login]);

  return (
    <QueryView
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={{
        title: 'No pending reviews',
        hint: "PRs where you're a requested reviewer will show up here.",
      }}
    >
      {(data) => (
        <div>
          {data.items.map((item) => {
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
                    <Badge tone="attention" className="ml-2 shrink-0">
                      {priority}
                    </Badge>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </QueryView>
  );
}
