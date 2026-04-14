import { useCallback, useMemo, useState } from 'react';
import {
  fetchAssignedPrs,
  repoSlugFromUrl,
  type SearchIssueItem,
} from '../../lib/github-api';
import { useIssueList } from '../hooks/useIssueList';
import { relativeAge } from './IssueRowMeta';
import { TabHeader, TabStates } from './TabChrome';
import { applyFilter, EMPTY_FILTER, FilterBar, type FilterState } from './FilterBar';
import { QuickActions } from './QuickActions';

interface Props {
  login: string;
  token: string;
}

function statusLabel(item: SearchIssueItem): { text: string; className: string } {
  if (item.draft) {
    return { text: 'Draft', className: 'border-gh-border-default text-gh-fg-muted' };
  }
  const hasChangesRequested = item.labels.some((l) =>
    /changes.?requested/i.test(l.name),
  );
  if (hasChangesRequested) {
    return {
      text: 'Changes requested',
      className: 'border-gh-danger-emphasis text-gh-danger-emphasis',
    };
  }
  return {
    text: 'Open',
    className: 'border-gh-success-emphasis text-gh-success-emphasis',
  };
}

export function AssignedPrsTab({ login, token }: Props) {
  const fetcher = useCallback(() => fetchAssignedPrs(login, token), [login, token]);
  const list = useIssueList(Boolean(login && token), fetcher, [login, token]);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  const filtered = useMemo(() => applyFilter(list.items, filter), [list.items, filter]);

  return (
    <section>
      <TabHeader
        title="Assigned PRs"
        subtitle="Open pull requests assigned to you"
        status={list.status}
        onRefresh={() => void list.refresh()}
      />
      <FilterBar items={list.items} state={filter} onChange={setFilter} />
      <TabStates
        status={list.status}
        error={list.error}
        isEmpty={filtered.length === 0}
        emptyMessage={
          list.items.length === 0
            ? 'No PRs assigned to you. Nice.'
            : 'No PRs match these filters.'
        }
      >
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const status = statusLabel(item);
            return (
              <li key={item.id}>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 hover:border-gh-accent-emphasis"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-gh-fg-muted">
                        {repoSlugFromUrl(item.repository_url)} #{item.number}
                      </div>
                      <div className="truncate text-sm font-semibold text-gh-fg-default">
                        {item.title}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] text-gh-fg-muted">
                        {relativeAge(item.updated_at ?? item.created_at)}
                      </span>
                      <QuickActions item={item} token={token} onAfterAction={() => void list.refresh()} />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${status.className}`}
                    >
                      {status.text}
                    </span>
                    {item.comments > 0 && (
                      <span className="text-[10px] text-gh-fg-muted">
                        {item.comments} comment{item.comments === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </TabStates>
    </section>
  );
}
