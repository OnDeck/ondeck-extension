import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow } from '../IssueRow';
import { TabShell } from './TabShell';

interface Props {
  token: string | null;
  login: string | null;
}

export function MentionsTab({ token, login }: Props) {
  const query = login ? `is:open mentions:${login}` : null;
  const list = useIssueList(token, query);

  return (
    <TabShell
      title="Mentions"
      status={list.status}
      error={list.error}
      isEmpty={list.items.length === 0}
      emptyMessage="No open mentions. You're all caught up."
      onRefresh={() => void list.refresh()}
    >
      <ul>
        {list.items.map((item) => (
          <IssueRow
            key={item.id}
            item={item}
            badge={{ kind: 'mention', label: item.pull_request ? 'PR' : 'Issue' }}
          />
        ))}
      </ul>
    </TabShell>
  );
}
