import {
  isDraftPullRequest,
  isPullRequest,
  repoFullNameFromItem,
  type IssueSearchItem,
} from '../../lib/github-api';
import { relativeTime } from '../lib/relativeTime';

interface Props {
  item: IssueSearchItem;
  trailing?: React.ReactNode;
  subtitle?: React.ReactNode;
}

function StatusBadge({ item }: { item: IssueSearchItem }) {
  if (!isPullRequest(item)) {
    return (
      <span className="rounded-full bg-gh-success-emphasis/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-success-emphasis">
        Issue
      </span>
    );
  }
  if (isDraftPullRequest(item)) {
    return (
      <span className="rounded-full bg-gh-fg-muted/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
        Draft
      </span>
    );
  }
  const changesRequested = item.labels.some((l) => /changes.?requested/i.test(l.name));
  if (changesRequested) {
    return (
      <span className="rounded-full bg-gh-danger-emphasis/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
        Changes
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gh-success-emphasis/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-success-emphasis">
      Open
    </span>
  );
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
