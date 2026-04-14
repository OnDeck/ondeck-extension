import type { IssueSearchItem } from '../../lib/github-api';
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

function MentionRow({ item, login }: { item: IssueSearchItem; login: string }) {
  const repo = parseOwnerRepoFromRepositoryUrl(item.repository_url) ?? '';
  const age = formatRelativeTime(item.updated_at);
  const snippet = buildSnippet(item.body ?? '', login);

  return (
    <button
      type="button"
      onClick={() => openInNewTab(item.html_url)}
      className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-gh-canvas-subtle"
    >
      <div className="truncate text-sm font-medium text-gh-fg-default">{item.title}</div>
      {snippet ? (
        <div className="line-clamp-2 text-[11px] text-gh-fg-muted">{snippet}</div>
      ) : null}
      <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
        <span className="truncate">
          {repo}
          {item.number ? ` #${item.number}` : ''}
        </span>
        <span className="shrink-0">{age}</span>
      </div>
    </button>
  );
}

function buildSnippet(body: string, login: string): string {
  if (!body) return '';
  const marker = `@${login}`;
  const idx = body.toLowerCase().indexOf(marker.toLowerCase());
  if (idx === -1) {
    return body.slice(0, 160).replace(/\s+/g, ' ').trim();
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + marker.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < body.length ? '…' : '';
  return `${prefix}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export function Mentions({ login, onBack }: Props) {
  const { status, items, error, refresh } = useIssueSearch(
    `is:open mentions:${login}`,
  );

  return (
    <TabListView
      title="Mentions"
      onBack={onBack}
      status={status}
      items={items}
      error={error}
      onRefresh={() => void refresh()}
      emptyMessage="You have no open mentions."
      showStatusBadge={false}
      renderItem={(item) => <MentionRow item={item} login={login} />}
    />
  );
}
