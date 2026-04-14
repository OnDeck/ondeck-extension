import type { SearchIssueItem } from '../../lib/github-api';
import { recordReview } from '../../lib/stats';
import { IssueListView } from './IssueListView';

interface Props {
  active: boolean;
  activeLogin: string | null;
}

function subtitleFor(item: SearchIssueItem): string {
  const comments = item.comments === 1 ? '1 comment' : `${item.comments} comments`;
  const requester = item.user ? `opened by @${item.user.login}` : null;
  return [requester, comments].filter(Boolean).join(' · ');
}

export function ReviewsView({ active, activeLogin }: Props) {
  return (
    <IssueListView
      active={active}
      title="Review requests"
      query="reviewRequests"
      emptyMessage="No PRs are waiting on your review. Nice."
      showPriority
      subtitleFor={subtitleFor}
      dismissLabel="Mark as reviewed"
      onDismiss={
        activeLogin
          ? () => {
              void recordReview(activeLogin);
            }
          : undefined
      }
    />
  );
}
