import { useState } from 'react';
import type { Viewer } from '../../lib/github-api';
import { useSearchIssues } from '../hooks/useSearchIssues';
import { FeedFilters, INITIAL_FILTERS, applyFilters, type FeedFilterState } from './FeedFilters';
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
  const [filters, setFilters] = useState<FeedFilterState>(INITIAL_FILTERS);
  const filtered = applyFilters(items, filters);

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Mentions"
        subtitle={`Open issues & PRs mentioning @${viewer.login}`}
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      <FeedFilters items={items} state={filters} onChange={setFilters} />
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
      {status === 'ready' && items.length > 0 && filtered.length === 0 && (
        <FeedState status="empty" message="No mentions match those filters." />
      )}
      {filtered.length > 0 && (
        <FeedList>
          {filtered.map((item) => {
            const excerpt = snippet(item.body, viewer.login);
            return (
              <li key={item.id} className="flex flex-col">
                <IssueListRow item={item} showAuthor showQuickActions />
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
