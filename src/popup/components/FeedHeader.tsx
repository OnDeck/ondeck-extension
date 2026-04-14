interface Props {
  title: string;
  subtitle?: string;
  busy?: boolean;
  onRefresh?: () => void;
}

export function FeedHeader({ title, subtitle, busy, onRefresh }: Props) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-gh-fg-muted">{subtitle}</div>
        )}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
