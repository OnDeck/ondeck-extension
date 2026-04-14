import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchPullRequestDetails,
  parseRepoFromUrl,
  type IssueSearchItem,
} from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import {
  formatRelativeTime,
  openInNewTab,
  parseOwnerRepoFromRepositoryUrl,
} from '../lib/format';
import { TabListView } from './TabListView';

interface Props {
  login: string;
  onBack: () => void;
}

const PRIORITY_PATTERNS = [/blocking[-_ ]?deploy/i, /p0/i, /urgent/i, /critical/i];

function isPriority(item: IssueSearchItem): boolean {
  return item.labels.some((l) => PRIORITY_PATTERNS.some((pat) => pat.test(l.name)));
}

function useChangedFilesMap(items: IssueSearchItem[]): Record<number, number> {
  const [map, setMap] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    setMap({});
    if (items.length === 0) return;
    (async () => {
      const { token } = await getStoredAuth();
      if (!token || cancelled) return;
      for (const item of items) {
        const coords = parseRepoFromUrl(item.repository_url);
        if (!coords) continue;
        try {
          const details = await fetchPullRequestDetails(
            token,
            coords.owner,
            coords.repo,
            item.number,
          );
          if (cancelled) return;
          setMap((prev) => ({ ...prev, [item.id]: details.changed_files }));
        } catch {
          // Ignore per-item errors; the row just omits the files-changed count.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  return map;
}

function ReviewRow({
  item,
  changedFiles,
}: {
  item: IssueSearchItem;
  changedFiles?: number;
}) {
  const repo = parseOwnerRepoFromRepositoryUrl(item.repository_url) ?? '';
  const age = formatRelativeTime(item.updated_at);
  const priority = isPriority(item);

  return (
    <button
      type="button"
      onClick={() => openInNewTab(item.html_url)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gh-canvas-subtle"
    >
      {item.user ? (
        <img
          src={item.user.avatar_url}
          alt={item.user.login}
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-gh-border-default"
        />
      ) : (
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-gh-border-default bg-gh-canvas-subtle" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-gh-fg-default">
            {item.title}
          </div>
          {priority ? (
            <span className="shrink-0 rounded-full border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gh-danger-emphasis">
              Priority
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[11px] text-gh-fg-muted">
          <span className="truncate">
            {repo} #{item.number}
            {item.user ? ` · @${item.user.login}` : ''}
          </span>
          <span className="shrink-0">
            {changedFiles !== undefined ? `${changedFiles} files · ` : ''}
            {age}
          </span>
        </div>
      </div>
    </button>
  );
}

export function Reviews({ login, onBack }: Props) {
  const { status, items, error, refresh } = useIssueSearch(
    `is:pr is:open review-requested:${login}`,
  );
  const changedFilesMap = useChangedFilesMap(items);

  return (
    <TabListView
      title="Review requests"
      onBack={onBack}
      status={status}
      items={items}
      error={error}
      onRefresh={() => void refresh()}
      emptyMessage="No PRs are waiting on your review."
      showStatusBadge={false}
      renderItem={(item) => (
        <ReviewRow item={item} changedFiles={changedFilesMap[item.id]} />
      )}
    />
  );
}
