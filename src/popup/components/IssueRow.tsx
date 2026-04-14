import { formatRelativeTime } from '../../lib/relative-time';
import { parseRepoFromUrl, type SearchIssueItem } from '../../lib/github-api';
import { StatusBadge, type PrStatus } from './StatusBadge';

interface Props {
  item: SearchIssueItem;
  status?: PrStatus;
  secondary?: React.ReactNode;
}

export function IssueRow({ item, status, secondary }: Props) {
  const repo = parseRepoFromUrl(item.repository_url);
  const url = item.pull_request?.html_url ?? item.html_url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-1 border-b border-gh-border-muted px-3 py-2 hover:bg-gh-canvas-subtle"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 truncate text-[13px] font-medium text-gh-fg-default">
          {item.title}
        </span>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
        <span className="truncate">{repo}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">#{item.number}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{formatRelativeTime(item.updated_at)}</span>
      </div>
      {secondary && <div className="text-[11px] text-gh-fg-muted">{secondary}</div>}
    </a>
  );
}
