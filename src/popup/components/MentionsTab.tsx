import type { Viewer } from '../../lib/github-api';
import { useSearchIssues } from '../hooks/useSearchIssues';
import { FeedHeader } from './FeedHeader';
import { FeedList } from './FeedList';
import { FeedState } from './FeedState';
import { IssueListRow } from './IssueListRow';

interface Props {
  viewer: Viewer;
}

function snippet(body: string | null | undefined, login: string): string | null {
  if (!body) return null;
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return body.slice(0, 120).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + 120);
  const excerpt = body.slice(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '…' : '') + excerpt + (end < body.length ? '…' : '');
}

export function MentionsTab({ viewer }: Props) {
  const query = `is:open mentions:${viewer.login}`;
  const { status, items, error, refresh } = useSearchIssues(query);

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Mentions"
        subtitle={`Open issues & PRs mentioning @${viewer.login}`}
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      {status === 'error' && (
        <FeedState
          status="error"
          message={error ?? 'Failed to load mentions'}
          onRetry={refresh}
        />
      )}
      {status === 'loading' && items.length === 0 && (
        <FeedState status="loading" message="Loading mentions…" />
      )}
      {status === 'ready' && items.length === 0 && (
        <FeedState status="empty" message="No open mentions. You're all caught up." />
      )}
      {items.length > 0 && (
        <FeedList>
          {items.map((item) => {
            const excerpt = snippet(item.body, viewer.login);
            return (
              <li key={item.id} className="flex flex-col">
                <IssueListRow item={item} showAuthor />
                {excerpt && (
                  <div className="border-t border-gh-border-muted bg-gh-canvas-default/50 px-3 pb-2 text-[11px] text-gh-fg-muted">
                    {excerpt}
                  </div>
                )}
              </li>
            );
          })}
        </FeedList>
      )}
    </div>
  );
}
