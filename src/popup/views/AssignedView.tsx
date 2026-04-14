import { useMemo } from 'react';
import type { SearchIssueItem } from '../../lib/github-api';
import { IssueRow } from '../components/IssueRow';
import { ViewHeader } from '../components/ViewHeader';
import { useIssueList } from '../hooks/useIssueList';
import { usePrReviewStates } from '../hooks/usePrReviewStates';
import type { PrStatus } from '../components/StatusBadge';

interface Props {
  token: string | null;
}

function deriveStatus(
  item: SearchIssueItem,
  reviewState: ReturnType<typeof usePrReviewStates> extends Map<number, infer V>
    ? V
    : never,
): PrStatus {
  if (item.draft) return 'draft';
  if (reviewState === 'CHANGES_REQUESTED') return 'changes-requested';
  if (reviewState === 'APPROVED') return 'approved';
  return 'open';
}

export function AssignedView({ token }: Props) {
  const query = 'is:pr is:open assignee:@me archived:false';
  const { status, items, error, refresh } = useIssueList(token, query);
  const reviewStates = usePrReviewStates(token, items);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        item,
        status: deriveStatus(item, reviewStates.get(item.id) ?? null),
      })),
    [items, reviewStates],
  );

  return (
    <section className="flex h-full flex-col">
      <ViewHeader
        title="Assigned PRs"
        count={status === 'ready' ? items.length : undefined}
        busy={status === 'loading'}
        onRefresh={() => void refresh()}
      />

      {status === 'error' && (
        <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load assigned PRs.'}
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="flex-1 p-4 text-[11px] text-gh-fg-muted">Loading…</div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="flex-1 p-6 text-center text-[11px] text-gh-fg-muted">
          Nothing assigned to you. Enjoy the quiet.
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {rows.map(({ item, status: rowStatus }) => (
            <li key={item.id}>
              <IssueRow item={item} status={rowStatus} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
