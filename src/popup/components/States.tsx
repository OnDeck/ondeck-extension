import type { GitHubApiError } from '../../lib/github-api';

function SkeletonRow({ delay }: { delay: number }) {
  const block = 'tg-skel shrink-0 bg-tg-bg3';
  return (
    <div className="flex items-start border-b border-tg-line py-2.5 pr-2.5">
      {/* Accent bar stub */}
      <div className={`${block} mr-2.5 mt-[3px] h-10 w-0.5 rounded-[1px]`} style={{ animationDelay: `${delay}ms` }} />
      {/* Dot placeholder */}
      <div className="w-2 shrink-0" />
      {/* Icon stub */}
      <div
        className={`${block} ml-1.5 mt-px h-[22px] w-[22px] rounded-[11px]`}
        style={{ animationDelay: `${delay + 60}ms` }}
      />
      {/* Content stubs */}
      <div className="ml-[9px] flex flex-1 flex-col gap-1.5">
        <div className="tg-skel h-2.5 w-[60%] rounded-[3px] bg-tg-bg3" style={{ animationDelay: `${delay + 80}ms` }} />
        <div className="tg-skel h-3 w-[90%] rounded-[3px] bg-tg-bg3" style={{ animationDelay: `${delay + 100}ms` }} />
        <div className="tg-skel h-2.5 w-[40%] rounded-[3px] bg-tg-bg3" style={{ animationDelay: `${delay + 120}ms` }} />
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="bg-tg-bg1">
      {[0, 80, 160, 240, 320].map((delay) => (
        <SkeletonRow key={delay} delay={delay} />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title?: string; hint?: string } = {}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {/* Check icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-tg-success-border bg-tg-success-soft">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="var(--tg-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 9l4 4 7-7" />
        </svg>
      </div>

      <div>
        <div className="mb-1.5 text-[14px] font-semibold tracking-[-0.2px] text-tg-fg0">
          {title ?? 'Inbox zero.'}
        </div>
        <div className="max-w-[220px] text-[12px] leading-[1.5] text-tg-fg2">
          {hint ?? 'The next notification will land here — until then, go ship.'}
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  onReconnect,
}: {
  error: GitHubApiError;
  onRetry: () => void;
  onReconnect?: () => void;
}) {
  const copy = errorCopy(error);
  const showReconnect = Boolean(onReconnect) && (error.kind === 'unauthorized' || error.kind === 'forbidden');
  const button = 'cursor-pointer rounded-[5px] px-3.5 py-[5px] font-mono text-[11px] tracking-[0.2px]';

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      {/* ! badge */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-tg-critical-border bg-tg-critical-soft">
        <span className="font-mono text-[16px] font-bold leading-none text-tg-critical">!</span>
      </div>

      <div>
        <div className="mb-[5px] text-[13px] font-semibold tracking-[-0.2px] text-tg-fg0">{copy.title}</div>
        <div className="max-w-[220px] text-[12px] leading-[1.5] text-tg-fg2">{copy.subtitle}</div>
      </div>

      <div className="mt-0.5 flex gap-2">
        {showReconnect && (
          <button
            type="button"
            className={`${button} border-none bg-tg-accent font-semibold text-white`}
            onClick={onReconnect}
          >
            Reconnect
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className={`${button} border border-tg-line-strong bg-transparent text-tg-fg1`}
        >
          Retry
        </button>
      </div>

      <div className="mt-1 font-mono text-[10px] text-tg-fg3">{copy.code}</div>
    </div>
  );
}

function errorCopy(error: GitHubApiError): { title: string; subtitle: string; code: string } {
  switch (error.kind) {
    case 'unauthorized':
      return {
        title: 'GitHub token expired',
        subtitle: 'Your access token is no longer valid. Reconnect to resume notifications.',
        code: 'AUTH_TOKEN_INVALID · 401',
      };
    case 'forbidden':
      return {
        title: 'Missing permissions',
        subtitle:
          'This token can’t read notifications. Use a classic token with the notifications and repo scopes.',
        code: 'FORBIDDEN · check token scopes',
      };
    case 'rate_limited':
      return {
        title: 'Rate limited by GitHub',
        subtitle: error.message,
        code: `RATE_LIMITED · ${error.status}`,
      };
    case 'network':
      return {
        title: 'Network error',
        subtitle: 'Couldn’t reach GitHub. Check your connection and retry.',
        code: 'NETWORK_FAILURE · offline or unreachable',
      };
    default:
      return {
        title: 'Something went wrong',
        subtitle: error.message,
        code: `ERROR · ${error.message.slice(0, 40)}`,
      };
  }
}
