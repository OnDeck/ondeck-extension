import type { GitHubApiError } from '../../lib/github-api';

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 10px 10px 0',
        borderBottom: '1px solid var(--tg-line)',
        gap: 0,
      }}
    >
      {/* Priority bar stub */}
      <div
        className="tg-skel"
        style={{
          width: 2,
          height: 40,
          borderRadius: 1,
          marginRight: 10,
          marginTop: 3,
          flexShrink: 0,
          animationDelay: `${delay}ms`,
        }}
      />
      {/* Dot placeholder */}
      <div style={{ width: 8, flexShrink: 0 }} />
      {/* Avatar stub */}
      <div
        className="tg-skel"
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          marginLeft: 6,
          marginTop: 1,
          flexShrink: 0,
          animationDelay: `${delay + 60}ms`,
        }}
      />
      {/* Content stubs */}
      <div style={{ flex: 1, marginLeft: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          className="tg-skel"
          style={{ height: 10, width: '60%', borderRadius: 3, animationDelay: `${delay + 80}ms` }}
        />
        <div
          className="tg-skel"
          style={{ height: 12, width: '90%', borderRadius: 3, animationDelay: `${delay + 100}ms` }}
        />
        <div
          className="tg-skel"
          style={{ height: 10, width: '40%', borderRadius: 3, animationDelay: `${delay + 120}ms` }}
        />
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ background: 'var(--tg-bg1)' }}>
      {[0, 80, 160, 240, 320].map((delay, i) => (
        <SkeletonRow key={i} delay={delay} />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title?: string; hint?: string } = {}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        gap: 12,
        textAlign: 'center',
      }}
    >
      {/* Check icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(52, 211, 153, 0.12)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
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
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--tg-fg0)',
            letterSpacing: -0.2,
            marginBottom: 6,
          }}
        >
          {title ?? 'Inbox zero.'}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--tg-fg2)',
            lineHeight: 1.5,
            maxWidth: 220,
          }}
        >
          {hint ?? 'The next notification will land here — until then, go ship.'}
        </div>
      </div>
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
  const isAuth = error.kind === 'unauthorized' || error.kind === 'forbidden';
  const title = isAuth
    ? 'GitHub token expired'
    : error.kind === 'network'
      ? 'Network error'
      : 'Something went wrong';
  const subtitle = isAuth
    ? 'Your access token is no longer valid. Reconnect to resume notifications.'
    : error.message;
  const errorCode = isAuth
    ? 'AUTH_TOKEN_EXPIRED · scope: notifications'
    : error.kind === 'network'
      ? 'NETWORK_FAILURE · offline or unreachable'
      : `ERROR · ${error.message.slice(0, 40)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 12,
        textAlign: 'center',
      }}
    >
      {/* ! badge */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(239, 107, 107, 0.12)',
          border: '1px solid rgba(239, 107, 107, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--tg-critical)',
            lineHeight: 1,
            fontFamily: 'var(--tg-mono)',
          }}
        >
          !
        </span>
      </div>

      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--tg-fg0)',
            letterSpacing: -0.2,
            marginBottom: 5,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--tg-fg2)',
            lineHeight: 1.5,
            maxWidth: 220,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        {isAuth && (
          <button
            type="button"
            style={{
              padding: '5px 14px',
              borderRadius: 5,
              border: 'none',
              background: 'var(--tg-accent)',
              color: '#fff',
              fontFamily: 'var(--tg-mono)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 0.2,
            }}
            onClick={onRetry}
          >
            Reconnect
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '5px 14px',
            borderRadius: 5,
            border: '1px solid var(--tg-line-strong)',
            background: 'transparent',
            color: 'var(--tg-fg1)',
            fontFamily: 'var(--tg-mono)',
            fontSize: 11,
            cursor: 'pointer',
            letterSpacing: 0.2,
          }}
        >
          Retry
        </button>
      </div>

      <div
        style={{
          fontFamily: 'var(--tg-mono)',
          fontSize: 10,
          color: 'var(--tg-fg3)',
          marginTop: 4,
        }}
      >
        {errorCode}
      </div>
    </div>
  );
}
