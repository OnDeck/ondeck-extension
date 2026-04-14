import {
  issueIsPullRequest,
  relativeTime,
  repoFromIssue,
  type IssueResult,
} from '../../lib/github-api';

interface Props {
  issue: IssueResult;
  showPriority?: boolean;
  snippet?: string;
}

type StatusKind = 'open' | 'draft' | 'changes-requested' | 'merged' | 'closed';

function statusFor(issue: IssueResult): StatusKind {
  if (issueIsPullRequest(issue)) {
    if (issue.pull_request?.merged_at) return 'merged';
    if (issue.draft || issue.pull_request?.draft) return 'draft';
    if (issue.labels.some((l) => /changes\s*requested/i.test(l.name))) {
      return 'changes-requested';
    }
  }
  if (issue.state === 'closed') return 'closed';
  return 'open';
}

const STATUS_COPY: Record<StatusKind, { label: string; classes: string }> = {
  open: { label: 'Open', classes: 'bg-gh-success-emphasis/15 text-gh-success-emphasis' },
  draft: { label: 'Draft', classes: 'bg-gh-fg-muted/20 text-gh-fg-muted' },
  'changes-requested': {
    label: 'Changes',
    classes: 'bg-gh-attention-emphasis/20 text-gh-attention-emphasis',
  },
  merged: { label: 'Merged', classes: 'bg-gh-done-emphasis/20 text-gh-done-emphasis' },
  closed: { label: 'Closed', classes: 'bg-gh-danger-emphasis/15 text-gh-danger-emphasis' },
};

const PRIORITY_PATTERNS = [/blocking/i, /urgent/i, /^p0$/i, /critical/i];

export function IssueRow({ issue, showPriority, snippet }: Props) {
  const status = statusFor(issue);
  const statusInfo = STATUS_COPY[status];
  const repo = repoFromIssue(issue);
  const priorityLabel = showPriority
    ? issue.labels.find((l) => PRIORITY_PATTERNS.some((p) => p.test(l.name)))
    : undefined;

  return (
    <a
      href={issue.html_url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-gh-canvas-default"
    >
      <div className="flex items-start gap-2">
        <img
          src={issue.user.avatar_url}
          alt={issue.user.login}
          className="mt-0.5 h-5 w-5 flex-none rounded-full border border-gh-border-default"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-gh-fg-default">{issue.title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gh-fg-muted">
            <span className="truncate">{repo}</span>
            <span aria-hidden>·</span>
            <span>#{issue.number}</span>
            <span aria-hidden>·</span>
            <span>{relativeTime(issue.updated_at)}</span>
          </div>
          {snippet && (
            <p className="mt-1 line-clamp-2 text-[11px] text-gh-fg-muted">{snippet}</p>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.classes}`}
          >
            {statusInfo.label}
          </span>
          {priorityLabel && (
            <span className="rounded-full bg-gh-danger-emphasis/15 px-2 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
              {priorityLabel.name}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
