import { useMemo } from 'react';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { IssueListView } from '../components/IssueListView';

interface Props {
  token: string;
  login: string;
  onBack: () => void;
}

export function AssignedPrsView({ token, login, onBack }: Props) {
  const query = useMemo(() => `is:pr assignee:${login} is:open`, [login]);
  const { items, loading, error, refresh } = useIssueSearch(token, query);
  return (
    <IssueListView
      title="Assigned PRs"
      onBack={onBack}
      items={items}
      loading={loading}
      error={error}
      onRefresh={refresh}
      emptyLabel="No PRs are assigned to you."
    />
  );
}
