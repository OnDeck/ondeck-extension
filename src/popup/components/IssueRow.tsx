import type { IssueSearchItem } from '../../lib/github-api';
import {
  formatRelativeTime,
  openInNewTab,
  parseOwnerRepoFromRepositoryUrl,
} from '../lib/format';

export type PrStatus = 'Open' | 'Draft' | 'Changes Requested';

export function derivePrStatus(item: IssueSearchItem): PrStatus {
  if (item.draft) return 'Draft';
  const hasChangesRequestedLabel = item.labels.some((l) =>
    /changes[-_ ]?requested/i.test(l.name),
  );
  if (hasChangesRequestedLabel) return 'Changes Requested';
  return 'Open';
}

const STATUS_CLASSES: Record<PrStatus, string> = {
  Open: 'border-gh-success-emphasis/60 text-gh-success-emphasis bg-gh-success-emphasis/10',
  Draft: 'border-gh-border-default text-gh-fg-muted bg-gh-canvas-subtle',
  'Changes Requested':
    'border-gh-attention-emphasis/60 text-gh-attention-emphasis bg-gh-attention-emphasis/10',
};

interface Props {
  item: IssueSearchItem;
  showStatusBadge?: boolean;
}

export function IssueRow({ item, showStatusBadge = true }: Props) {
  const repo = parseOwnerRepoFromRepositoryUrl(item.repository_url) ?? '';
  const age = formatRelativeTime(item.updated_at);
  const status = derivePrStatus(item);

  return (
    <button
      type="button"
      onClick={() => openInNewTab(item.html_url)}
      className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-gh-canvas-subtle"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-gh-fg-default">
          {item.title}
        </div>
        {showStatusBadge ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[status]}`}
          >
            {status}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
        <span className="truncate">
          {repo}
          {item.number ? ` #${item.number}` : ''}
        </span>
        <span className="shrink-0">{age}</span>
      </div>
    </button>
  );
}
