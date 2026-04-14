import type { Viewer } from '../../lib/github-api';
import { relativeAge } from '../../lib/time';
import { useReviewRequests } from '../hooks/useReviewRequests';

interface Props {
  viewer: Viewer;
}

/**
 * Reviews tab — PRs where the viewer is a requested reviewer.
 * Rows show the title, requester avatar, repo/number, age, files-
 * changed count (once the metrics fetch resolves) and a priority
 * indicator when a "Blocking"/"Priority" label is present.
 */
export function ReviewsTab({ viewer }: Props) {
  const { status, items, error, refresh } = useReviewRequests(viewer.login);
  const loading = status === 'loading' || status === 'idle';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Review requests
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {loading && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            Loading review requests…
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-danger-emphasis">
            {error ?? 'Failed to load review requests.'}
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            You have no pending review requests.
          </div>
        )}

        {items.map((item) => {
          const open = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
              void chrome.tabs.create({ url: item.htmlUrl });
            } else {
              window.open(item.htmlUrl, '_blank', 'noopener,noreferrer');
            }
          };
          const blocker = item.labels.find((l) =>
            /blocking|deploy|urgent|priority|security/i.test(l.name),
          );
          return (
            <button
              key={item.id}
              type="button"
              onClick={open}
              className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition hover:border-gh-accent-emphasis"
            >
              <div className="flex items-center gap-2">
                {item.author && (
                  <img
                    src={item.author.avatarUrl}
                    alt={item.author.login}
                    className="h-4 w-4 rounded-full border border-gh-border-muted"
                  />
                )}
                <span className="truncate text-xs font-medium text-gh-fg-default">
                  {item.title}
                </span>
                {blocker && (
                  <span
                    className="ml-auto inline-flex shrink-0 items-center rounded-full bg-gh-danger-emphasis px-1.5 py-[1px] text-[10px] font-semibold text-white"
                    title={blocker.name}
                  >
                    {blocker.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
                <span className="truncate">
                  {item.org}/{item.repo} #{item.number}
                </span>
                <span>·</span>
                <span>{relativeAge(item.updatedAt)}</span>
                {item.metrics && (
                  <>
                    <span>·</span>
                    <span title={`${item.metrics.changedFiles} files changed`}>
                      {item.metrics.changedFiles} files
                    </span>
                    <span className="text-gh-success-emphasis">
                      +{item.metrics.additions}
                    </span>
                    <span className="text-gh-danger-emphasis">
                      −{item.metrics.deletions}
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
