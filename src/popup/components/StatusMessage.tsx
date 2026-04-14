import type { ReactNode } from 'react';

interface Props {
  tone?: 'muted' | 'danger';
  children: ReactNode;
}

export function StatusMessage({ tone = 'muted', children }: Props) {
  const color = tone === 'danger' ? 'text-gh-danger-emphasis' : 'text-gh-fg-muted';
  return (
    <div
      className={`rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-xs ${color}`}
    >
      {children}
    </div>
  );
}
