import type { PrReviewState } from '../../lib/github-api';
import { relativeAge } from '../../lib/time';

interface Props {
  title: string;
  org: string;
  repo: string;
  number: number;
  htmlUrl: string;
  state: 'open' | 'closed';
  draft: boolean;
  updatedAt: string;
  reviewState?: PrReviewState;
  labels?: { name: string; color: string }[];
}

/**
 * A single row in the Assigned PRs / Reviews / Mentions lists. Clicking
 * the row opens the underlying GitHub URL in a new tab. Status badges
 * follow Primer conventions: Draft (muted), Open (green), Changes
 * Requested (red).
 */
export function PrListItem({
  title,
  org,
  repo,
  number,
  htmlUrl,
  state,
  draft,
  updatedAt,
  reviewState,
  labels,
}: Props) {
  const open = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url: htmlUrl });
    } else {
      window.open(htmlUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const badge = resolveBadge(state, draft, reviewState);
  const priorityLabel = labels?.find((l) => /blocking|deploy|urgent|priority/i.test(l.name));

  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition hover:border-gh-accent-emphasis"
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold ${badge.className}`}
          title={badge.tooltip}
        >
          {badge.label}
        </span>
        <span className="flex-1 truncate text-xs font-medium text-gh-fg-default">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
        <span className="truncate">
          {org}/{repo} #{number}
        </span>
        <span>·</span>
        <span>{relativeAge(updatedAt)}</span>
        {priorityLabel && (
          <>
            <span>·</span>
            <span
              className="inline-flex items-center rounded-full bg-gh-danger-emphasis px-1.5 py-[1px] text-[10px] font-semibold text-white"
              title={priorityLabel.name}
            >
              {priorityLabel.name}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function resolveBadge(
  state: 'open' | 'closed',
  draft: boolean,
  reviewState: PrReviewState | undefined,
): { label: string; className: string; tooltip: string } {
  if (reviewState === 'changes_requested') {
    return {
      label: 'Changes',
      className: 'bg-gh-danger-emphasis text-white',
      tooltip: 'Changes requested',
    };
  }
  if (draft) {
    return {
      label: 'Draft',
      className: 'bg-gh-canvas-default text-gh-fg-muted border border-gh-border-muted',
      tooltip: 'Draft pull request',
    };
  }
  if (state === 'closed') {
    return {
      label: 'Closed',
      className: 'bg-gh-done-emphasis text-white',
      tooltip: 'Closed',
    };
  }
  return {
    label: 'Open',
    className: 'bg-gh-success-emphasis text-white',
    tooltip: 'Open',
  };
}
