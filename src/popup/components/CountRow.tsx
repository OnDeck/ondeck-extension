import type { ReactNode } from 'react';

interface Props {
  label: string;
  count: number | null;
  icon: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

/**
 * A compact list row styled to match GitHub's Primer list conventions.
 * Renders a leading icon, a label, and a trailing count pill. Clicking
 * the row invokes `onClick` so the dashboard can navigate to the
 * per-category tab.
 */
export function CountRow({ label, count, icon, onClick, loading }: Props) {
  const disabled = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition hover:border-gh-accent-emphasis disabled:cursor-default disabled:hover:border-gh-border-default"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-gh-border-muted text-gh-fg-muted group-hover:text-gh-fg-default">
        {icon}
      </span>
      <span className="flex-1 truncate text-xs text-gh-fg-default">{label}</span>
      <span className="inline-flex min-w-[1.75rem] justify-center rounded-full border border-gh-border-muted bg-gh-canvas-default px-2 py-0.5 font-mono text-[11px] text-gh-fg-muted">
        {loading ? '…' : (count ?? '—')}
      </span>
    </button>
  );
}
