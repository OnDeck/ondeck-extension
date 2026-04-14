import type { ReactNode } from 'react';

interface Props {
  title: string;
  onRefresh: () => void;
  busy: boolean;
  status: 'loading' | 'ready' | 'error' | 'empty';
  error?: string | null;
  emptyMessage?: string;
  children?: ReactNode;
}

export function ListShell({
  title,
  onRefresh,
  busy,
  status,
  error,
  emptyMessage,
  children,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-default px-3 py-2">
        <div className="text-xs font-semibold text-gh-fg-default">{title}</div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {busy ? '…' : 'Refresh'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {status === 'loading' && (
          <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
            Loading…
          </div>
        )}
        {status === 'error' && (
          <div className="m-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
            {error ?? 'Something went wrong.'}
          </div>
        )}
        {status === 'empty' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
            {emptyMessage ?? 'Nothing here yet.'}
          </div>
        )}
        {status === 'ready' && <div className="flex flex-col gap-1 p-2">{children}</div>}
      </div>
    </div>
  );
}
