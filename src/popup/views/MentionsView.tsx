import { useMemo, useState } from 'react';
import { buildMentionSnippet } from '../../lib/snippet';
import { FilterBar } from '../components/FilterBar';
import { IssueRow } from '../components/IssueRow';
import { ViewHeader } from '../components/ViewHeader';
import { useIssueList } from '../hooks/useIssueList';
import {
  DEFAULT_FILTERS,
  applyFilters,
  collectLabels,
  collectRepos,
  type ListFilters,
} from '../filters';

interface Props {
  token: string | null;
  viewerLogin: string;
}

export function MentionsView({ token, viewerLogin }: Props) {
  const query = `is:open mentions:${viewerLogin} archived:false`;
  const { status, items, error, refresh } = useIssueList(token, query);
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const repos = useMemo(() => collectRepos(items), [items]);
  const labels = useMemo(() => collectLabels(items), [items]);

  return (
    <section className="flex h-full flex-col">
      <ViewHeader
        title="Mentions"
        count={status === 'ready' ? filtered.length : undefined}
        busy={status === 'loading'}
        onRefresh={() => void refresh()}
      />

      <FilterBar filters={filters} repos={repos} labels={labels} onChange={setFilters} />

      {status === 'error' && (
        <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load mentions.'}
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="flex-1 p-4 text-[11px] text-gh-fg-muted">Loading…</div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className="flex-1 p-6 text-center text-[11px] text-gh-fg-muted">
          {items.length === 0 ? 'No open mentions.' : 'No mentions match the current filters.'}
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
            const snippet = buildMentionSnippet(item.body, viewerLogin);
            return (
              <li key={item.id}>
                <IssueRow
                  item={item}
                  secondary={snippet ? <span className="line-clamp-2">{snippet}</span> : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
