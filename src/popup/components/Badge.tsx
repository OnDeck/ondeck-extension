import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

// Color tokens map to GitHub Primer palette; adding a new tone is one entry.
type Tone =
  | 'success'
  | 'danger'
  | 'attention'
  | 'accent'
  | 'muted'
  | 'done';

type Variant = 'soft' | 'outline';

const TONE_SOFT: Record<Tone, string> = {
  success: 'bg-gh-success-emphasis/20 text-gh-success-emphasis',
  danger: 'bg-gh-danger-emphasis/20 text-gh-danger-emphasis',
  attention: 'bg-gh-attention-emphasis/20 text-gh-attention-emphasis',
  accent: 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis',
  muted: 'bg-gh-fg-muted/20 text-gh-fg-muted',
  done: 'bg-gh-done-emphasis/20 text-gh-done-emphasis',
};

const TONE_OUTLINE: Record<Tone, string> = {
  success: 'border-gh-success-emphasis/40 text-gh-success-emphasis',
  danger: 'border-gh-danger-emphasis/40 text-gh-danger-emphasis',
  attention: 'border-gh-attention-emphasis/40 text-gh-attention-emphasis',
  accent: 'border-gh-accent-emphasis/40 text-gh-accent-emphasis',
  muted: 'border-gh-border-default text-gh-fg-muted',
  done: 'border-gh-done-emphasis/40 text-gh-done-emphasis',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  variant?: Variant;
  className?: string;
}

export function Badge({
  children,
  tone = 'muted',
  variant = 'soft',
  className,
}: BadgeProps) {
  const base =
    'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold';
  const toneClasses =
    variant === 'outline'
      ? `border ${TONE_OUTLINE[tone]}`
      : TONE_SOFT[tone];
  return <span className={cn(base, toneClasses, className)}>{children}</span>;
}
