import type { ReactNode } from 'react';

interface Props {
  status: 'loading' | 'error' | 'empty';
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function FeedState({ status, message, onRetry, children }: Props) {
  const tone =
    status === 'error'
      ? 'border-gh-danger-emphasis/50 bg-gh-danger-emphasis/10 text-gh-danger-emphasis'
      : 'border-gh-border-default bg-gh-canvas-subtle text-gh-fg-muted';
  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center text-xs ${tone}`}
    >
      <div>{message}</div>
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
        >
          Retry
        </button>
      )}
    </div>
  );
}
