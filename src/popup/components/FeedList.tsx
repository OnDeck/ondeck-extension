import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function FeedList({ children }: Props) {
  return (
    <ul className="flex flex-col divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
      {children}
    </ul>
  );
}
