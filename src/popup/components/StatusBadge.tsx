import type { PrReviewStatus } from '../../lib/github-api';

export type PrStatus = 'draft' | 'open' | PrReviewStatus;

const LABELS: Record<PrStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  pending: 'Open',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  commented: 'Commented',
};

const STYLES: Record<PrStatus, string> = {
  draft: 'border-gh-fg-muted/60 text-gh-fg-muted',
  open: 'border-gh-success-emphasis/60 text-gh-success-emphasis',
  pending: 'border-gh-success-emphasis/60 text-gh-success-emphasis',
  approved: 'border-gh-success-emphasis/60 text-gh-success-emphasis',
  changes_requested: 'border-gh-danger-emphasis/60 text-gh-danger-emphasis',
  commented: 'border-gh-accent-emphasis/60 text-gh-accent-emphasis',
};

export function StatusBadge({ status }: { status: PrStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
