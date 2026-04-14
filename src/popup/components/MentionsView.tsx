import type { SearchIssueItem } from '../../lib/github-api';
import { IssueListView } from './IssueListView';

interface Props {
  active: boolean;
}

// Extract a short context snippet from the issue/PR body, cleaned of
// most markdown noise so it renders well in the narrow popup.
function snippetFor(item: SearchIssueItem): string | null {
  const body = item.body ?? '';
  if (!body.trim()) return null;
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[>#*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned;
}

export function MentionsView({ active }: Props) {
  return (
    <IssueListView
      active={active}
      title="Mentions"
      query="mentions"
      emptyMessage="No open issues or PRs mention you."
      subtitleFor={snippetFor}
    />
  );
}
