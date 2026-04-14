import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchPullRequestDetail,
  fetchReviewRequests,
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

const BLOCKING_LABEL_PATTERN = /(blocking|urgent|p0|hotfix|critical)/i;

function isBlocking(item: SearchIssueItem): boolean {
  return item.labels.some((l) => BLOCKING_LABEL_PATTERN.test(l.name));
}

type DetailState = Record<number, { changedFiles: number }>;

export function ReviewsTab({ login, token }: Props) {
  const fetcher = useCallback(() => fetchReviewRequests(login, token), [login, token]);
  const list = useIssueList(Boolean(login && token), fetcher, [login, token]);
  const [details, setDetails] = useState<DetailState>({});
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

  const filtered = useMemo(() => applyFilter(list.items, filter), [list.items, filter]);

  // After the list resolves, fan out detail fetches for changed_files.
  // Keep it bounded: the search call already caps at 30 items.
  useEffect(() => {
    if (list.status !== 'ready' || list.items.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: DetailState = {};
      await Promise.all(
        list.items.map(async (item) => {
          const slug = repoSlugFromUrl(item.repository_url);
          const [owner, repo] = slug.split('/');
          if (!owner || !repo) return;
          try {
            const detail = await fetchPullRequestDetail(owner, repo, item.number, token);
            next[item.id] = { changedFiles: detail.changed_files };
          } catch {
            // Non-fatal: just skip the changed_files indicator for this row.
          }
        }),
      );
      if (!cancelled) setDetails(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [list.status, list.items, token]);

  return (
    <section>
      <TabHeader
        title="Review requests"
        subtitle="PRs waiting on your review"
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
            ? 'Your review queue is empty. Go ship something.'
            : 'No reviews match these filters.'
        }
      >
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const blocking = isBlocking(item);
            const detail = details[item.id];
            return (
              <li key={item.id}>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    'block rounded-md border bg-gh-canvas-subtle px-3 py-2 hover:border-gh-accent-emphasis',
                    blocking ? 'border-gh-danger-emphasis' : 'border-gh-border-default',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    {item.user && (
                      <img
                        src={item.user.avatar_url}
                        alt={item.user.login}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-gh-border-default"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-gh-fg-muted">
                        {repoSlugFromUrl(item.repository_url)} #{item.number}
                        {item.user && <> · @{item.user.login}</>}
                      </div>
                      <div className="truncate text-sm font-semibold text-gh-fg-default">
                        {item.title}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] text-gh-fg-muted">
                        {relativeAge(item.updated_at ?? item.created_at)}
                      </span>
                      <QuickActions
                        item={item}
                        token={token}
                        showMarkReviewed
                        onAfterAction={() => void list.refresh()}
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {blocking && (
                      <span className="rounded-md border border-gh-danger-emphasis px-1.5 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                        Blocking
                      </span>
                    )}
                    {detail && (
                      <span className="text-[10px] text-gh-fg-muted">
                        {detail.changedFiles} file{detail.changedFiles === 1 ? '' : 's'} changed
                      </span>
                    )}
                    {item.comments > 0 && (
                      <span className="text-[10px] text-gh-fg-muted">
                        {item.comments} comment{item.comments === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </TabStates>
    </section>
  );
}
