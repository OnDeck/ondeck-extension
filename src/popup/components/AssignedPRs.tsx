import { searchAssignedPrs } from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { IssueRow } from './IssueRow';
import { QueryView } from './QueryView';

interface Props {
  token: string;
  login: string;
}

export function AssignedPRs({ token, login }: Props) {
  const query = useGitHubQuery(() => searchAssignedPrs(token, login), [token, login]);

  return (
    <QueryView
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={{
        title: 'No assigned PRs',
        hint: 'Open pull requests assigned to you will show up here.',
      }}
    >
      {(data) => (
        <div>
          {data.items.map((item) => (
            <IssueRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </QueryView>
  );
}
