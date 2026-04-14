import type { Viewer } from '../../lib/github-api';
import { relativeAge } from '../../lib/time';
import { useMentions } from '../hooks/useMentions';

interface Props {
  viewer: Viewer;
}

/**
 * Mentions tab. Each row shows the title, repo, timestamp, and a short
 * body snippet extracted from the issue/PR body so the context of the
 * mention is visible at a glance.
 */
export function MentionsTab({ viewer }: Props) {
  const { status, items, error, refresh } = useMentions(viewer.login);
  const loading = status === 'loading' || status === 'idle';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Mentions
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
            Loading mentions…
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-danger-emphasis">
            {error ?? 'Failed to load mentions.'}
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            You have no open mentions.
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
          const snippet = buildSnippet(item.body, viewer.login);
          return (
            <button
              key={item.id}
              type="button"
              onClick={open}
              className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition hover:border-gh-accent-emphasis"
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-gh-fg-default">
                  {item.title}
                </span>
              </div>
              {snippet && (
                <div className="truncate text-[11px] text-gh-fg-muted">{snippet}</div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
                <span className="truncate">
                  {item.org}/{item.repo} #{item.number}
                </span>
                <span>·</span>
                <span>{relativeAge(item.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Build a one-line snippet that preferably contains the @mention. If
 * the mention isn't present (e.g. the mention is in a comment, not the
 * body) fall back to the first non-empty line.
 */
function buildSnippet(body: string | null | undefined, login: string): string | null {
  if (!body) return null;
  const compact = body.replace(/\r/g, '').replace(/\n+/g, ' ').trim();
  if (!compact) return null;
  const mentionMarker = `@${login}`;
  const idx = compact.toLowerCase().indexOf(mentionMarker.toLowerCase());
  const start = idx >= 0 ? Math.max(0, idx - 24) : 0;
  const snippet = compact.slice(start, start + 140);
  return snippet.length < compact.length ? `…${snippet}…` : snippet;
}
