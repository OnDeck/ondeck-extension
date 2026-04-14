import { useEffect, useState } from 'react';
import {
  fetchPullRequestDetails,
  type PullRequestDetails,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { relativeTime, repoSlug } from '../lib/relative-time';
import { EmptyState, ErrorState, LoadingState, ViewHeader } from './ListStates';

interface Props {
  viewer: Viewer;
  token: string | null;
}

const BLOCKING_LABELS = ['blocking', 'blocker', 'critical', 'p0', 'priority/p0', 'urgent', 'deploy'];

function isBlocking(item: SearchIssueItem): boolean {
  return item.labels.some((l) => BLOCKING_LABELS.includes(l.name.toLowerCase()));
}

function usePrDetails(
  token: string | null,
  items: SearchIssueItem[],
): Record<number, PullRequestDetails> {
  const [map, setMap] = useState<Record<number, PullRequestDetails>>({});
  useEffect(() => {
    if (!token || items.length === 0) return;
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        const repo = repoSlug(item.repository_url);
        try {
          const details = await fetchPullRequestDetails(token, repo, item.number);
          return [item.id, details] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, PullRequestDetails> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setMap(next);
    });
    return () => {
      cancelled = true;
    };
  }, [token, items]);
  return map;
}

export function Reviews({ viewer, token }: Props) {
  const query = `is:pr is:open review-requested:${viewer.login}`;
  const { items, loading, error, refresh } = useIssueSearch(token, query);
  const details = usePrDetails(token, items);

  return (
    <div className="flex flex-col">
      <ViewHeader title="Review requests" loading={loading} onRefresh={refresh} />
      {error && <ErrorState message={error} />}
      {loading && items.length === 0 && <LoadingState />}
      {!loading && !error && items.length === 0 && (
        <EmptyState message="No PRs awaiting your review." />
      )}
      <ul className="flex flex-col">
        {items.map((item) => {
          const pr = details[item.id];
          const requester = pr?.user ?? item.user ?? undefined;
          return (
            <li key={item.id} className="border-t border-gh-border-muted first:border-t-0">
              <a
                href={item.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle"
              >
                {requester && (
                  <img
                    src={requester.avatar_url}
                    alt={requester.login}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-gh-border-default"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-gh-fg-default">{item.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
                    <span className="truncate">{repoSlug(item.repository_url)}</span>
                    <span>·</span>
                    <span>#{item.number}</span>
                    {pr && (
                      <>
                        <span>·</span>
                        <span>
                          {pr.changed_files} file{pr.changed_files === 1 ? '' : 's'}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span>{relativeTime(item.updated_at)}</span>
                  </div>
                </div>
                {isBlocking(item) && (
                  <span className="rounded-md bg-gh-danger-emphasis/20 px-1.5 py-0.5 text-[10px] font-semibold text-gh-danger-emphasis">
                    Blocking
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
