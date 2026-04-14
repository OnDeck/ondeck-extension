import { useMemo } from 'react';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { IssueListView } from '../components/IssueListView';
import { IssueRow } from '../components/IssueRow';

interface Props {
  token: string;
  login: string;
  onBack: () => void;
}

function snippetForMention(body: string | null, login: string): string | undefined {
  if (!body) return undefined;
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/[#*_>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  const lower = cleaned.toLowerCase();
  const needle = `@${login.toLowerCase()}`;
  const idx = lower.indexOf(needle);
  if (idx === -1) return cleaned.slice(0, 140);
  const start = Math.max(0, idx - 60);
  const end = Math.min(cleaned.length, idx + needle.length + 80);
  return `${start > 0 ? '…' : ''}${cleaned.slice(start, end)}${end < cleaned.length ? '…' : ''}`;
}

export function MentionsView({ token, login, onBack }: Props) {
  const query = useMemo(() => `mentions:${login} is:open`, [login]);
  const { items, loading, error, refresh } = useIssueSearch(token, query);
  return (
    <IssueListView
      title="Mentions"
      onBack={onBack}
      items={items}
      loading={loading}
      error={error}
      onRefresh={refresh}
      emptyLabel="No open mentions."
      renderRow={(issue) => (
        <IssueRow issue={issue} snippet={snippetForMention(issue.body, login)} />
      )}
    />
  );
}
