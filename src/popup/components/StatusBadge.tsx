export type PrStatus = 'open' | 'draft' | 'changes-requested' | 'approved';

interface Props {
  status: PrStatus;
}

const LABELS: Record<PrStatus, string> = {
  open: 'Open',
  draft: 'Draft',
  'changes-requested': 'Changes',
  approved: 'Approved',
};

const CLASSES: Record<PrStatus, string> = {
  open: 'border-gh-success-emphasis/50 bg-gh-success-emphasis/10 text-gh-success-emphasis',
  draft: 'border-gh-border-default bg-gh-canvas-subtle text-gh-fg-muted',
  'changes-requested':
    'border-gh-danger-emphasis/50 bg-gh-danger-emphasis/10 text-gh-danger-emphasis',
  approved: 'border-gh-done-emphasis/50 bg-gh-done-emphasis/10 text-gh-done-emphasis',
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={
        'inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-semibold ' +
        CLASSES[status]
      }
    >
      {LABELS[status]}
    </span>
  );
}
