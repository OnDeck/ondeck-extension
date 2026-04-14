import type { Viewer } from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { relativeTime, repoSlug } from '../lib/relative-time';
import { EmptyState, ErrorState, LoadingState, ViewHeader } from './ListStates';

interface Props {
  viewer: Viewer;
  token: string | null;
}

// Extract ~120 characters centered on the first @mention of the viewer,
// falling back to the start of the body if no explicit mention is found.
function mentionSnippet(body: string | null | undefined, login: string): string {
  if (!body) return '';
  const flat = body.replace(/\s+/g, ' ').trim();
  const needle = `@${login}`;
  const idx = flat.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return flat.slice(0, 120) + (flat.length > 120 ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(flat.length, idx + needle.length + 60);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < flat.length ? '…' : '';
  return `${prefix}${flat.slice(start, end)}${suffix}`;
}

export function Mentions({ viewer, token }: Props) {
  const query = `is:open mentions:${viewer.login}`;
  const { items, loading, error, refresh } = useIssueSearch(token, query);

  return (
    <div className="flex flex-col">
      <ViewHeader title="Mentions" loading={loading} onRefresh={refresh} />
      {error && <ErrorState message={error} />}
      {loading && items.length === 0 && <LoadingState />}
      {!loading && !error && items.length === 0 && (
        <EmptyState message="No open mentions." />
      )}
      <ul className="flex flex-col">
        {items.map((item) => {
          const isPr = Boolean(item.pull_request);
          return (
            <li key={item.id} className="border-t border-gh-border-muted first:border-t-0">
              <a
                href={item.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 px-4 py-2 hover:bg-gh-canvas-subtle"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-gh-border-muted px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
                    {isPr ? 'PR' : 'Issue'}
                  </span>
                  <span className="truncate text-sm text-gh-fg-default">{item.title}</span>
                </div>
                <div className="truncate text-[11px] text-gh-fg-muted">
                  {repoSlug(item.repository_url)} · #{item.number} ·{' '}
                  {relativeTime(item.updated_at)}
                </div>
                {mentionSnippet(item.body, viewer.login) && (
                  <div className="line-clamp-2 text-[11px] text-gh-fg-muted">
                    {mentionSnippet(item.body, viewer.login)}
                  </div>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
