import { repoSlugFromUrl, type SearchIssueItem } from '../../lib/github-api';
import { usePrReviewStatus } from '../hooks/usePrReviewStatus';
import { openInNewTab, relativeTime } from '../lib/format';
import { QuickActions } from './QuickActions';
import { StatusBadge, type PrStatus } from './StatusBadge';

interface Props {
  item: SearchIssueItem;
  resolveReviewStatus?: boolean;
  showAuthor?: boolean;
  showQuickActions?: boolean;
}

export function IssueListRow({
  item,
  resolveReviewStatus = false,
  showAuthor = false,
  showQuickActions = false,
}: Props) {
  const repoSlug = repoSlugFromUrl(item.repository_url);
  const isPr = Boolean(item.pull_request);
  const reviewStatus = usePrReviewStatus(
    repoSlug,
    item.number,
    isPr && resolveReviewStatus,
  );

  const status: PrStatus = item.draft
    ? 'draft'
    : reviewStatus ?? 'open';

  return (
    <div className="flex w-full items-start gap-2 px-3 py-2 transition hover:bg-gh-border-muted/40">
      <button
        type="button"
        onClick={() => openInNewTab(item.html_url)}
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
      >
        {showAuthor && item.user && (
          <img
            src={item.user.avatar_url}
            alt={item.user.login}
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gh-fg-default">
              {item.title}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gh-fg-muted">
            <span className="truncate">{repoSlug}#{item.number}</span>
            <span>·</span>
            <span className="shrink-0">{relativeTime(item.updated_at)}</span>
          </div>
        </div>
        {isPr && <StatusBadge status={status} />}
      </button>
      {showQuickActions && <QuickActions item={item} />}
    </div>
  );
}
