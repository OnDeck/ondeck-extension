import {
  isDraftPullRequest,
  isPullRequest,
  repoFullNameFromItem,
  type IssueSearchItem,
} from '../../lib/github-api';
import { relativeTime } from '../../lib/relativeTime';
import { Badge } from './Badge';

interface Props {
  item: IssueSearchItem;
  trailing?: React.ReactNode;
  subtitle?: React.ReactNode;
}

const CHANGES_REQUESTED_RE = /changes.?requested/i;

function StatusBadge({ item }: { item: IssueSearchItem }) {
  if (!isPullRequest(item)) {
    return <Badge tone="success">Issue</Badge>;
  }
  if (isDraftPullRequest(item)) {
    return <Badge tone="muted">Draft</Badge>;
  }
  const changesRequested = item.labels.some((l) => CHANGES_REQUESTED_RE.test(l.name));
  if (changesRequested) {
    return <Badge tone="danger">Changes</Badge>;
  }
  return <Badge tone="success">Open</Badge>;
}

export function IssueRow({ item, trailing, subtitle }: Props) {
  const repo = repoFullNameFromItem(item);
  return (
    <a
      href={item.html_url}
      target="_blank"
      rel="noreferrer"
      className="group block border-b border-gh-border-muted px-4 py-3 last:border-b-0 hover:bg-gh-canvas-subtle"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge item={item} />
            <span className="truncate text-[11px] text-gh-fg-muted">{repo}</span>
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-gh-fg-default group-hover:text-gh-accent-emphasis">
            {item.title}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gh-fg-muted">
            <span>#{item.number}</span>
            <span>·</span>
            <span>{relativeTime(item.updated_at)}</span>
            {subtitle && (
              <>
                <span>·</span>
                <span className="truncate">{subtitle}</span>
              </>
            )}
          </div>
        </div>
        {trailing}
      </div>
    </a>
  );
}
