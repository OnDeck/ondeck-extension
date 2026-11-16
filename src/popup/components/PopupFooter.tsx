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
    <div className="flex h-[28px] shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-t border-tg-line bg-tg-bg1 px-2.5 font-mono text-[10.5px] text-tg-fg3">
      {refreshing ? (
        <span>Refreshing…</span>
      ) : refreshFailed ? (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer border-none bg-transparent p-0 text-tg-important hover:text-tg-fg1"
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
        className="ml-auto text-tg-fg2 no-underline hover:text-tg-fg1"
      >
        Open GitHub inbox ↗
      </a>
    </div>
  );
}
