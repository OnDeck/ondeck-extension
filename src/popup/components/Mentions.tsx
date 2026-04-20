import { searchMentions } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { IssueRow } from './IssueRow';
import { QueryView } from './QueryView';

interface Props {
  token: string;
  login: string;
}

export function Mentions({ token, login }: Props) {
  const query = useGitHubQuery(() => searchMentions(token, login), [token, login]);

  return (
    <QueryView
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={{
        title: 'No active mentions',
        hint: 'Issues and PRs where you were @mentioned will show up here.',
      }}
    >
      {(data) => (
        <div>
          {data.items.map((item) => (
            <IssueRow
              key={item.id}
              item={item}
              subtitle={<span>by @{item.user.login}</span>}
            />
          ))}
        </div>
      )}
    </QueryView>
  );
}
