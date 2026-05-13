import type { PriorityLevel } from '../../shared/notifications/prioritizer';
import { Badge } from './Badge';

type BadgeTone = 'danger' | 'attention' | 'accent' | 'muted';

const TONES: Record<PriorityLevel, BadgeTone> = {
  critical: 'danger',
  important: 'attention',
  normal: 'accent',
  muted: 'muted',
};

const LABELS: Record<PriorityLevel, string> = {
  critical: 'Critical',
  important: 'Important',
  normal: 'Normal',
  muted: 'Low',
};

const PRIORITY_BORDER: Record<PriorityLevel, string> = {
  critical: 'border-gh-danger-emphasis',
  important: 'border-gh-attention-emphasis',
  normal: 'border-gh-accent-emphasis',
  muted: 'border-transparent',
};

interface Props {
  level: PriorityLevel;
  variant?: 'badge' | 'dot' | 'border-class';
}

export function PriorityBadge({ level, variant = 'badge' }: Props) {
  if (variant === 'border-class') {
    return <span className={PRIORITY_BORDER[level]} />;
  }
  return (
    <Badge tone={TONES[level]} variant="soft">
      {LABELS[level]}
    </Badge>
  );
}

export function priorityBorderClass(level: PriorityLevel): string {
  return PRIORITY_BORDER[level];
}
