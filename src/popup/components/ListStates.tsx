interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ViewHeader({ title, subtitle, loading, onRefresh }: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gh-fg-default">
          {title}
        </div>
        {subtitle && <div className="text-[11px] text-gh-fg-muted">{subtitle}</div>}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="px-4 py-6 text-center text-xs text-gh-fg-muted">{label}</div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/50 bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-center text-xs text-gh-fg-muted">{message}</div>
  );
}
