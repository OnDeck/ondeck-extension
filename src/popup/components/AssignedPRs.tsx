import { useState } from 'react';
import type { Viewer, SearchIssueItem } from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { relativeTime, repoSlug } from '../lib/relative-time';
import { applyFilters, EMPTY_FILTERS, type Filters } from '../lib/filters';
import { EmptyState, ErrorState, LoadingState, ViewHeader } from './ListStates';
import { FilterBar } from './FilterBar';

interface Props {
  viewer: Viewer;
  token: string | null;
}

type PrStatus = 'draft' | 'changes-requested' | 'open';

function statusOf(item: SearchIssueItem): PrStatus {
  if (item.draft || item.pull_request?.draft) return 'draft';
  const labels = item.labels.map((l) => l.name.toLowerCase());
  if (labels.some((l) => l.includes('changes requested') || l === 'changes-requested')) {
    return 'changes-requested';
  }
  return 'open';
}

function StatusBadge({ status }: { status: PrStatus }) {
  const map: Record<PrStatus, { label: string; className: string }> = {
    open: {
      label: 'Open',
      className: 'bg-gh-success-emphasis/20 text-gh-success-emphasis',
    },
    draft: {
      label: 'Draft',
      className: 'bg-gh-border-muted text-gh-fg-muted',
    },
    'changes-requested': {
      label: 'Changes',
      className: 'bg-gh-danger-emphasis/20 text-gh-danger-emphasis',
    },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function AssignedPRs({ viewer, token }: Props) {
  const query = `is:pr is:open assignee:${viewer.login}`;
  const { items, loading, error, refresh } = useIssueSearch(token, query);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const visible = applyFilters(items, filters);

  return (
    <div className="flex flex-col">
      <ViewHeader title="Assigned PRs" loading={loading} onRefresh={refresh} />
      <FilterBar filters={filters} onChange={setFilters} />
      {error && <ErrorState message={error} />}
      {loading && items.length === 0 && <LoadingState />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState
          message={items.length === 0 ? 'No open PRs assigned to you.' : 'No PRs match your filters.'}
        />
      )}
      <ul className="flex flex-col">
        {visible.map((item) => (
          <li key={item.id} className="border-t border-gh-border-muted first:border-t-0">
            <a
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-gh-fg-default">{item.title}</div>
                <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
                  <span className="truncate">{repoSlug(item.repository_url)}</span>
                  <span>·</span>
                  <span>#{item.number}</span>
                  <span>·</span>
                  <span>{relativeTime(item.updated_at)}</span>
                </div>
              </div>
              <StatusBadge status={statusOf(item)} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
