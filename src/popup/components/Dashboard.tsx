import type { Viewer } from '../../lib/github-api';
import { useDashboardCounts } from '../hooks/useDashboardCounts';
import { CountRow } from './CountRow';

interface Props {
  viewer: Viewer;
  onNavigate?: (tab: 'assigned' | 'reviews' | 'mentions' | 'notifications') => void;
}

// Inline SVG icons keep the bundle light and match Primer's 16px glyphs.
const PrIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
  </svg>
);

const EyeIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.678 1.367-1.932 2.637-3.023C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.622-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
  </svg>
);

const BellIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Z" />
  </svg>
);

const AtIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
    <path d="M8 0a8 8 0 0 1 7.906 6.914c.064.39.094.779.094 1.172 0 1.98-.969 3.414-2.719 3.414-.953 0-1.66-.395-2.063-1.133-.679.73-1.648 1.133-2.719 1.133-2.125 0-3.75-1.617-3.75-4s1.625-4 3.75-4c.875 0 1.68.28 2.313.75V4.5h1.5v5.25c0 .5.312.75.937.75.938 0 1.5-.938 1.5-2.422 0-.297-.023-.59-.07-.879A6.496 6.496 0 1 0 13.5 13.016l.984 1.136A7.999 7.999 0 1 1 8 0Z" />
  </svg>
);

/**
 * Dashboard home tab. Shows the viewer's avatar + handle followed by
 * clickable rows for Assigned PRs, Review Requests, Mentions, and
 * Unread Notifications. Each row click delegates to the parent so the
 * caller can switch tabs.
 */
export function Dashboard({ viewer, onNavigate }: Props) {
  const { status, counts, error, refresh } = useDashboardCounts(viewer.login);
  const loading = status === 'loading' || status === 'idle';

  return (
    <div className="flex h-full flex-col">
      <section className="flex items-center gap-3 px-4 py-3">
        <img
          src={viewer.avatar_url}
          alt={viewer.login}
          className="h-10 w-10 rounded-full border border-gh-border-default"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gh-fg-default">
            {viewer.name ?? viewer.login}
          </div>
          <a
            href={viewer.html_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-gh-fg-muted hover:text-gh-accent-emphasis"
          >
            @{viewer.login}
          </a>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </section>

      <section className="flex flex-col gap-2 px-4 pb-4">
        <CountRow
          label="Assigned PRs"
          count={counts?.assignedPrs ?? null}
          icon={PrIcon}
          loading={loading}
          onClick={onNavigate ? () => onNavigate('assigned') : undefined}
        />
        <CountRow
          label="Review requests"
          count={counts?.reviewRequests ?? null}
          icon={EyeIcon}
          loading={loading}
          onClick={onNavigate ? () => onNavigate('reviews') : undefined}
        />
        <CountRow
          label="Mentions"
          count={counts?.mentions ?? null}
          icon={AtIcon}
          loading={loading}
          onClick={onNavigate ? () => onNavigate('mentions') : undefined}
        />
        <CountRow
          label="Unread notifications"
          count={counts?.notifications ?? null}
          icon={BellIcon}
          loading={loading}
          onClick={onNavigate ? () => onNavigate('notifications') : undefined}
        />
      </section>

      {status === 'error' && (
        <div className="mx-4 mb-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load dashboard.'}
        </div>
      )}

      {status === 'ready' && counts && sum(counts) === 0 && (
        <div className="mx-4 mb-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
          Inbox zero. Nothing needs your attention right now.
        </div>
      )}
    </div>
  );
}

function sum(counts: { assignedPrs: number; reviewRequests: number; mentions: number; notifications: number }) {
  return counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.notifications;
}
