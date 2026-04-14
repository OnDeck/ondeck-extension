import { useMemo, useState } from 'react';
import {
  parseRepoFromUrl,
  submitPullReview,
  type SearchIssueItem,
} from '../../lib/github-api';
import { recordReviewSubmitted } from '../../lib/stats';
import { FilterBar } from '../components/FilterBar';
import { IssueRow } from '../components/IssueRow';
import { ViewHeader } from '../components/ViewHeader';
import { useIssueList } from '../hooks/useIssueList';
import { usePrDetails } from '../hooks/usePrDetails';
import {
  DEFAULT_FILTERS,
  applyFilters,
  collectLabels,
  collectRepos,
  type ListFilters,
} from '../filters';

interface Props {
  token: string | null;
  activeAccountId: number | null;
}

const PRIORITY_LABEL_HINTS = [
  'blocking',
  'urgent',
  'critical',
  'priority',
  'hotfix',
  'deploy',
];

function hasPriorityLabel(item: SearchIssueItem): string | null {
  for (const label of item.labels) {
    const lower = label.name.toLowerCase();
    if (PRIORITY_LABEL_HINTS.some((hint) => lower.includes(hint))) {
      return label.name;
    }
  }
  return null;
}

export function ReviewsView({ token, activeAccountId }: Props) {
  const query = 'is:pr is:open review-requested:@me archived:false';
  const { status, items, error, refresh } = useIssueList(token, query);
  const details = usePrDetails(token, items);
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const repos = useMemo(() => collectRepos(items), [items]);
  const labels = useMemo(() => collectLabels(items), [items]);

  async function markReviewed(item: SearchIssueItem): Promise<void> {
    if (!token) return;
    const repo = parseRepoFromUrl(item.repository_url);
    const [owner, name] = repo.split('/');
    if (!owner || !name) return;
    setBusyIds((prev) => new Set(prev).add(item.id));
    try {
      await submitPullReview(
        token,
        owner,
        name,
        item.number,
        'COMMENT',
        'Reviewed via GitHub Workflow Assistant ✅',
      );
      await recordReviewSubmitted(activeAccountId);
      await refresh();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  return (
    <section className="flex h-full flex-col">
      <ViewHeader
        title="Review Requests"
        count={status === 'ready' ? filtered.length : undefined}
        busy={status === 'loading'}
        onRefresh={() => void refresh()}
      />

      <FilterBar filters={filters} repos={repos} labels={labels} onChange={setFilters} />

      {status === 'error' && (
        <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load review requests.'}
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="flex-1 p-4 text-[11px] text-gh-fg-muted">Loading…</div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className="flex-1 p-6 text-center text-[11px] text-gh-fg-muted">
          {items.length === 0
            ? 'No pending review requests.'
            : 'No reviews match the current filters.'}
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
            const pr = details.get(item.id) ?? null;
            const priority = hasPriorityLabel(item);
            const requester = pr?.user ?? item.user;
            const busy = busyIds.has(item.id);
            return (
              <li key={item.id} className="relative">
                <IssueRow
                  item={item}
                  status={item.draft ? 'draft' : 'open'}
                  secondary={
                    <div className="flex flex-wrap items-center gap-2">
                      {requester && (
                        <span className="flex items-center gap-1">
                          <img
                            src={requester.avatar_url}
                            alt={requester.login}
                            className="h-3 w-3 rounded-full"
                          />
                          <span>{requester.login}</span>
                        </span>
                      )}
                      {pr && (
                        <span className="text-gh-fg-muted">
                          {pr.changed_files} file{pr.changed_files === 1 ? '' : 's'}
                        </span>
                      )}
                      {priority && (
                        <span className="rounded-full bg-gh-attention-emphasis/20 px-2 py-[1px] text-[10px] font-semibold text-gh-attention-emphasis">
                          ⚠ {priority}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void markReviewed(item);
                        }}
                        className="ml-auto rounded-md border border-gh-border-default px-2 py-[2px] text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
                      >
                        {busy ? 'Working…' : 'Mark reviewed'}
                      </button>
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
