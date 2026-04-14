import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow, type BadgeKind } from '../IssueRow';
import { TabShell } from './TabShell';
import type { IssueSearchItem } from '../../../lib/github-api';

interface Props {
  token: string | null;
  login: string | null;
}

export function AssignedTab({ token, login }: Props) {
  const query = login ? `is:pr is:open assignee:${login}` : null;
  const list = useIssueList(token, query);

  return (
    <TabShell
      title="Assigned PRs"
      status={list.status}
      error={list.error}
      isEmpty={list.items.length === 0}
      emptyMessage="No PRs assigned to you. Enjoy the quiet."
      onRefresh={() => void list.refresh()}
    >
      <ul>
        {list.items.map((item) => (
          <IssueRow key={item.id} item={item} badge={badgeFor(item)} />
        ))}
      </ul>
    </TabShell>
  );
}

function badgeFor(item: IssueSearchItem): { kind: BadgeKind; label: string } {
  const draft = item.draft === true || item.pull_request?.draft === true;
  if (draft) return { kind: 'draft', label: 'Draft' };
  const hasChanges = item.labels.some((l) =>
    /changes?\s*requested/i.test(l.name ?? ''),
  );
  if (hasChanges) return { kind: 'changes-requested', label: 'Changes' };
  return { kind: 'open', label: 'Open' };
}
