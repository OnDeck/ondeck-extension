import { type IssueSearchItem, repoSlugFromIssue } from '../../lib/github-api';

export type BadgeKind = 'open' | 'draft' | 'changes-requested' | 'mention' | 'review';

interface Props {
  item: IssueSearchItem;
  badge?: { kind: BadgeKind; label: string };
  trailing?: React.ReactNode;
}

const BADGE_STYLES: Record<BadgeKind, string> = {
  open: 'border-gh-success-emphasis text-gh-success-emphasis',
  draft: 'border-gh-fg-muted text-gh-fg-muted',
  'changes-requested': 'border-gh-danger-emphasis text-gh-danger-emphasis',
  mention: 'border-gh-attention-emphasis text-gh-attention-emphasis',
  review: 'border-gh-accent-emphasis text-gh-accent-emphasis',
};

export function IssueRow({ item, badge, trailing }: Props) {
  const repo = repoSlugFromIssue(item);
  return (
    <li className="border-b border-gh-border-muted last:border-b-0">
      <a
        href={item.html_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 px-4 py-2.5 hover:bg-gh-canvas-subtle"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gh-fg-default">
              {item.title}
            </span>
            {badge && (
              <span
                className={
                  'shrink-0 rounded-full border px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide ' +
                  BADGE_STYLES[badge.kind]
                }
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-gh-fg-muted">
            {repo} · #{item.number} · {relativeTime(item.updated_at)}
          </div>
        </div>
        {trailing}
      </a>
    </li>
  );
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const seconds = Math.max(1, Math.floor(diff / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
