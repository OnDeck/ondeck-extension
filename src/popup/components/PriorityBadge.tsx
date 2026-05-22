import type { PriorityLevel } from '../../shared/notifications/prioritizer';
import { Badge } from './Badge';

type BadgeTone = 'danger' | 'attention' | 'accent' | 'muted';

const TONES: Record<PriorityLevel, BadgeTone> = {
  normal: 'accent',
};

const LABELS: Record<PriorityLevel, string> = {
  normal: 'Normal',
};

const PRIORITY_BORDER: Record<PriorityLevel, string> = {
  normal: 'border-gh-accent-emphasis',
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
