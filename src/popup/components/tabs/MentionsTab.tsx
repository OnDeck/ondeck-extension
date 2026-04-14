import { useState } from 'react';
import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow } from '../IssueRow';
import { TabShell } from './TabShell';
import { FilterBar, EMPTY_FILTERS, applyFilters, type Filters } from '../FilterBar';

interface Props {
  token: string | null;
  login: string | null;
}

export function MentionsTab({ token, login }: Props) {
  const query = login ? `is:open mentions:${login}` : null;
  const list = useIssueList(token, query);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const visible = applyFilters(list.items, filters);

  return (
    <TabShell
      title="Mentions"
      status={list.status}
      error={list.error}
      isEmpty={visible.length === 0}
      emptyMessage={
        list.items.length === 0
          ? "No open mentions. You're all caught up."
          : 'No mentions match the current filters.'
      }
      onRefresh={() => void list.refresh()}
    >
      <FilterBar items={list.items} value={filters} onChange={setFilters} />
      <ul>
        {visible.map((item) => (
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
