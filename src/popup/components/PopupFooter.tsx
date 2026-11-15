import { compactRelativeTime } from '../../shared/utils/compactRelativeTime';

interface Props {
  updatedAt: number | null;
  refreshing: boolean;
  refreshFailed: boolean;
  onRetry: () => void;
}

function syncLabel(updatedAt: number | null): string {
  if (updatedAt === null) return '';
  const age = Date.now() - updatedAt;
  return age < 60_000 ? 'Updated just now' : `Updated ${compactRelativeTime(new Date(updatedAt).toISOString())} ago`;
}

export function PopupFooter({ updatedAt, refreshing, refreshFailed, onRetry }: Props) {
  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        borderTop: '1px solid var(--tg-line)',
        background: 'var(--tg-bg1)',
        fontSize: 10.5,
        fontFamily: 'var(--tg-mono)',
        color: 'var(--tg-fg3)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {refreshing ? (
        <span>Refreshing…</span>
      ) : refreshFailed ? (
        <button
          type="button"
          onClick={onRetry}
          className="hover:text-[var(--tg-fg1)]"
          style={{
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--tg-important)',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Couldn’t refresh · Retry
        </button>
      ) : (
        <span>{syncLabel(updatedAt)}</span>
      )}
      <a
        href="https://github.com/notifications"
        target="_blank"
        rel="noreferrer"
        className="hover:text-[var(--tg-fg1)]"
        style={{ marginLeft: 'auto', color: 'var(--tg-fg2)', textDecoration: 'none' }}
      >
        Open GitHub inbox ↗
      </a>
    </div>
  );
}
