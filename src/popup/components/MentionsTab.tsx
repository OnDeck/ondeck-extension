import { useCallback, useMemo, useState } from 'react';
import {
  fetchMentions,
  repoSlugFromUrl,
  type SearchIssueItem,
} from '../../lib/github-api';
import { useIssueList } from '../hooks/useIssueList';
import { relativeAge } from './IssueRowMeta';
import { TabHeader, TabStates } from './TabChrome';
import { applyFilter, EMPTY_FILTER, FilterBar, type FilterState } from './FilterBar';
import { QuickActions } from './QuickActions';

interface Props {
  login: string;
  token: string;
}

function isPullRequest(item: SearchIssueItem): boolean {
  return Boolean(item.pull_request);
}

function bodySnippet(body: string | null | undefined, login: string): string {
  if (!body) return '';
  const mentionIdx = body.toLowerCase().indexOf(`@${login.toLowerCase()}`);
  const start = mentionIdx >= 0 ? Math.max(0, mentionIdx - 40) : 0;
  const slice = body
    .slice(start, start + 140)
    .replace(/\s+/g, ' ')
    .trim();
  return start > 0 ? `…${slice}` : slice;
}

export function MentionsTab({ login, token }: Props) {
  const fetcher = useCallback(() => fetchMentions(login, token), [login, token]);
  const list = useIssueList(Boolean(login && token), fetcher, [login, token]);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  const filtered = useMemo(() => applyFilter(list.items, filter), [list.items, filter]);

  return (
    <section>
      <TabHeader
        title="Mentions"
        subtitle="Open issues & PRs that @mention you"
        status={list.status}
        onRefresh={() => void list.refresh()}
      />
      <FilterBar items={list.items} state={filter} onChange={setFilter} />
      <TabStates
        status={list.status}
        error={list.error}
        isEmpty={filtered.length === 0}
        emptyMessage={
          list.items.length === 0
            ? "No open threads mention you. You're caught up."
            : 'No mentions match these filters.'
        }
      >
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const snippet = bodySnippet(item.body, login);
            const kind = isPullRequest(item) ? 'PR' : 'Issue';
            return (
              <li key={item.id}>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 hover:border-gh-accent-emphasis"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-gh-fg-muted">
                        <span className="mr-1 rounded-sm border border-gh-border-default px-1 py-px text-[10px] font-semibold text-gh-fg-muted">
                          {kind}
                        </span>
                        {repoSlugFromUrl(item.repository_url)} #{item.number}
                      </div>
                      <div className="truncate text-sm font-semibold text-gh-fg-default">
                        {item.title}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] text-gh-fg-muted">
                        {relativeAge(item.updated_at ?? item.created_at)}
                      </span>
                      <QuickActions item={item} token={token} onAfterAction={() => void list.refresh()} />
                    </div>
                  </div>
                  {snippet && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-gh-fg-muted">
                      {snippet}
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </TabStates>
    </section>
  );
}
