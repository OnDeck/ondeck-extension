import { relativeTime, repoFullNameFromUrl, type SearchIssueItem } from '../../lib/github-api';

type BadgeTone = 'open' | 'draft' | 'changes' | 'closed' | 'merged';

interface BadgeProps {
  tone: BadgeTone;
  label: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  open: 'bg-gh-success-emphasis/15 text-gh-success-emphasis border-gh-success-emphasis/30',
  draft: 'bg-gh-fg-muted/15 text-gh-fg-muted border-gh-border-default',
  changes: 'bg-gh-danger-emphasis/15 text-gh-danger-emphasis border-gh-danger-emphasis/30',
  closed: 'bg-gh-danger-emphasis/15 text-gh-danger-emphasis border-gh-danger-emphasis/30',
  merged: 'bg-gh-done-emphasis/15 text-gh-done-emphasis border-gh-done-emphasis/30',
};

function Badge({ tone, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

function statusFor(item: SearchIssueItem): { tone: BadgeTone; label: string } {
  if (item.state === 'closed') return { tone: 'closed', label: 'Closed' };
  if (item.pull_request?.draft || item.draft) {
    return { tone: 'draft', label: 'Draft' };
  }
  const hasChangesRequested = item.labels.some((l) =>
    l.name.toLowerCase().includes('changes requested'),
  );
  if (hasChangesRequested) {
    return { tone: 'changes', label: 'Changes' };
  }
  return { tone: 'open', label: 'Open' };
}

interface Props {
  item: SearchIssueItem;
  showPriority?: boolean;
  subtitle?: string | null;
  rightSlot?: React.ReactNode;
}

const BLOCKING_LABELS = ['blocking', 'blocking deploy', 'p0', 'priority: high', 'urgent'];

export function IssueRow({ item, showPriority = false, subtitle, rightSlot }: Props) {
  const status = statusFor(item);
  const repo = repoFullNameFromUrl(item.repository_url);
  const age = relativeTime(item.updated_at);
  const priority = showPriority
    ? item.labels.find((l) => BLOCKING_LABELS.includes(l.name.toLowerCase()))
    : undefined;

  return (
    <a
      href={item.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 px-3 py-2.5 hover:bg-gh-border-muted/40 focus:outline-none focus:ring-1 focus:ring-gh-accent-emphasis"
    >
      {item.user && (
        <img
          src={item.user.avatar_url}
          alt={item.user.login}
          className="mt-[2px] h-5 w-5 shrink-0 rounded-full border border-gh-border-default"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge tone={status.tone} label={status.label} />
          {priority && <Badge tone="changes" label="Blocking" />}
          <span className="truncate text-[11px] text-gh-fg-muted">{repo}</span>
          <span className="ml-auto shrink-0 text-[10px] text-gh-fg-muted">{age}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[13px] font-medium text-gh-fg-default">
          {item.title}
        </div>
        {subtitle && (
          <div className="mt-0.5 line-clamp-2 text-[11px] text-gh-fg-muted">{subtitle}</div>
        )}
      </div>
      {rightSlot}
    </a>
  );
}
