import { useState } from 'react';
import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow } from '../IssueRow';
import { TabShell } from './TabShell';
import { FilterBar, EMPTY_FILTERS, applyFilters, type Filters } from '../FilterBar';
import {
  markPullReviewed,
  repoSlugFromIssue,
  type IssueSearchItem,
} from '../../../lib/github-api';

interface Props {
  token: string | null;
  login: string | null;
}

const BLOCKING_LABEL = /block(ing|er)?|urgent|p0|p1/i;

export function ReviewsTab({ token, login }: Props) {
  const query = login ? `is:pr is:open review-requested:${login}` : null;
  const list = useIssueList(token, query);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [pending, setPending] = useState<Set<number>>(() => new Set());

  const visible = applyFilters(list.items, filters).filter((i) => !completed.has(i.id));

  async function onMarkReviewed(item: IssueSearchItem) {
    if (!token) return;
    const slug = repoSlugFromIssue(item);
    const [owner, repo] = slug.split('/');
    if (!owner || !repo) return;
    setPending((prev) => new Set(prev).add(item.id));
    try {
      await markPullReviewed(owner, repo, item.number, token);
      setCompleted((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.warn('[gh-workflow] mark reviewed failed', err);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  return (
    <TabShell
      title="Review requests"
      status={list.status}
      error={list.error}
      isEmpty={visible.length === 0}
      emptyMessage={
        list.items.length === 0
          ? 'No reviews waiting on you.'
          : 'No reviews match the current filters.'
      }
      onRefresh={() => void list.refresh()}
    >
      <FilterBar items={list.items} value={filters} onChange={setFilters} />
      <ul>
        {visible.map((item) => {
          const blocking = item.labels.some((l) => BLOCKING_LABEL.test(l.name ?? ''));
          const isPending = pending.has(item.id);
          return (
            <IssueRow
              key={item.id}
              item={item}
              badge={
                blocking
                  ? { kind: 'changes-requested', label: 'Blocking' }
                  : { kind: 'review', label: 'Review' }
              }
              trailing={
                <div className="flex shrink-0 items-center gap-2">
                  {item.user?.avatar_url && (
                    <img
                      src={item.user.avatar_url}
                      alt={item.user.login}
                      title={`Requested by @${item.user.login}`}
                      className="h-6 w-6 rounded-full border border-gh-border-default"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void onMarkReviewed(item);
                    }}
                    disabled={isPending}
                    title="Mark reviewed"
                    aria-label="Mark reviewed"
                    className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
                  >
                    {isPending ? '…' : '✓'}
                  </button>
                </div>
              }
            />
          );
        })}
      </ul>
      {login && (
        <p className="border-t border-gh-border-muted px-4 py-1.5 text-center text-[10px] text-gh-fg-muted">
          Tip: Ctrl/Cmd+Shift+G opens this popup from anywhere.
        </p>
      )}
    </TabShell>
  );
}
