import { repoSlugFromUrl, type SearchIssueItem, type Viewer } from '../../lib/github-api';
import { usePullSummary } from '../hooks/usePullSummary';
import { useSearchIssues } from '../hooks/useSearchIssues';
import { openInNewTab, relativeTime } from '../lib/format';
import { FeedHeader } from './FeedHeader';
import { FeedList } from './FeedList';
import { FeedState } from './FeedState';

interface Props {
  viewer: Viewer;
}

const PRIORITY_RE = /blocking|urgent|priority:?\s*(high|p0|p1)|p0|p1/i;

function isPriority(item: SearchIssueItem): boolean {
  return item.labels.some((label) => PRIORITY_RE.test(label.name));
}

export function ReviewsTab({ viewer }: Props) {
  const query = `is:pr is:open review-requested:${viewer.login}`;
  const { status, items, error, refresh } = useSearchIssues(query);

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Review requests"
        subtitle={`PRs waiting on your review, @${viewer.login}`}
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      {status === 'error' && (
        <FeedState
          status="error"
          message={error ?? 'Failed to load review requests'}
          onRetry={refresh}
        />
      )}
      {status === 'loading' && items.length === 0 && (
        <FeedState status="loading" message="Loading review requests…" />
      )}
      {status === 'ready' && items.length === 0 && (
        <FeedState status="empty" message="No PRs waiting on your review." />
      )}
      {items.length > 0 && (
        <FeedList>
          {items.map((item) => (
            <li key={item.id}>
              <ReviewRow item={item} />
            </li>
          ))}
        </FeedList>
      )}
    </div>
  );
}

function ReviewRow({ item }: { item: SearchIssueItem }) {
  const repoSlug = repoSlugFromUrl(item.repository_url);
  const summary = usePullSummary(repoSlug, item.number);
  const priority = isPriority(item);
  return (
    <button
      type="button"
      onClick={() => openInNewTab(item.html_url)}
      className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-gh-border-muted/40"
    >
      {item.user && (
        <img
          src={item.user.avatar_url}
          alt={item.user.login}
          className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
          title={`Requested by @${item.user.login}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {priority && (
            <span className="shrink-0 rounded-md border border-gh-danger-emphasis/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gh-danger-emphasis">
              Priority
            </span>
          )}
          <span className="truncate text-sm font-medium text-gh-fg-default">
            {item.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gh-fg-muted">
          <span className="truncate">{repoSlug}#{item.number}</span>
          <span>·</span>
          <span className="shrink-0">{relativeTime(item.updated_at)}</span>
          {summary && (
            <>
              <span>·</span>
              <span className="shrink-0">
                {summary.changed_files} file{summary.changed_files === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
