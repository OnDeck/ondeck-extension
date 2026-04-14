import { useState } from 'react';
import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow, type BadgeKind } from '../IssueRow';
import { TabShell } from './TabShell';
import { FilterBar, EMPTY_FILTERS, applyFilters, type Filters } from '../FilterBar';
import type { IssueSearchItem } from '../../../lib/github-api';

interface Props {
  token: string | null;
  login: string | null;
}

export function AssignedTab({ token, login }: Props) {
  const query = login ? `is:pr is:open assignee:${login}` : null;
  const list = useIssueList(token, query);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const visible = applyFilters(list.items, filters);

  return (
    <TabShell
      title="Assigned PRs"
      status={list.status}
      error={list.error}
      isEmpty={visible.length === 0}
      emptyMessage={
        list.items.length === 0
          ? 'No PRs assigned to you. Enjoy the quiet.'
          : 'No PRs match the current filters.'
      }
      onRefresh={() => void list.refresh()}
    >
      <FilterBar items={list.items} value={filters} onChange={setFilters} />
      <ul>
        {visible.map((item) => (
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
