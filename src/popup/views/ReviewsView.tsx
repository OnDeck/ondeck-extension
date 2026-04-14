import type { SearchIssueItem } from '../../lib/github-api';
import { IssueRow } from '../components/IssueRow';
import { ViewHeader } from '../components/ViewHeader';
import { useIssueList } from '../hooks/useIssueList';
import { usePrDetails } from '../hooks/usePrDetails';

interface Props {
  token: string | null;
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

export function ReviewsView({ token }: Props) {
  const query = 'is:pr is:open review-requested:@me archived:false';
  const { status, items, error, refresh } = useIssueList(token, query);
  const details = usePrDetails(token, items);

  return (
    <section className="flex h-full flex-col">
      <ViewHeader
        title="Review Requests"
        count={status === 'ready' ? items.length : undefined}
        busy={status === 'loading'}
        onRefresh={() => void refresh()}
      />

      {status === 'error' && (
        <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load review requests.'}
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="flex-1 p-4 text-[11px] text-gh-fg-muted">Loading…</div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="flex-1 p-6 text-center text-[11px] text-gh-fg-muted">
          No pending review requests.
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {items.map((item) => {
            const pr = details.get(item.id) ?? null;
            const priority = hasPriorityLabel(item);
            const requester = pr?.user ?? item.user;
            return (
              <li key={item.id}>
                <IssueRow
                  item={item}
                  status={item.draft ? 'draft' : 'open'}
                  secondary={
                    <div className="flex items-center gap-2">
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
