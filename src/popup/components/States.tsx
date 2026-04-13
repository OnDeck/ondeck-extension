import type { GitHubApiError } from '../../lib/github-api';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full items-center justify-center py-8 text-xs text-gh-fg-muted"
    >
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
      <div className="text-xs font-semibold text-gh-fg-default">{title}</div>
      {hint && <div className="mt-1 text-[11px] text-gh-fg-muted">{hint}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: GitHubApiError;
  onRetry: () => void;
}) {
  const title =
    error.kind === 'unauthorized'
      ? 'Your GitHub token is invalid or expired.'
      : error.kind === 'forbidden'
        ? 'Forbidden — check your token scopes.'
        : error.kind === 'network'
          ? 'Network error'
          : 'Something went wrong';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-6 text-center">
      <div className="text-xs font-semibold text-gh-danger-emphasis">{title}</div>
      <div className="text-[11px] text-gh-fg-muted">{error.message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-md border border-gh-border-default px-3 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
      >
        Retry
      </button>
    </div>
  );
}
