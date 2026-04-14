interface Props {
  title: string;
  count?: number;
  busy: boolean;
  onRefresh: () => void;
  action?: React.ReactNode;
}

export function ViewHeader({ title, count, busy, onRefresh, action }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-gh-border-muted px-4 py-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          {title}
        </h2>
        {typeof count === 'number' && (
          <span className="rounded-full bg-gh-canvas-subtle px-2 py-[1px] text-[10px] text-gh-fg-muted">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {action}
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
