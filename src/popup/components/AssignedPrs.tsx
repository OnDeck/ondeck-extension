import { useIssueSearch } from '../hooks/useIssueSearch';
import { TabListView } from './TabListView';

interface Props {
  login: string;
  onBack: () => void;
}

export function AssignedPrs({ login, onBack }: Props) {
  const { status, items, error, refresh } = useIssueSearch(
    `is:pr is:open assignee:${login}`,
  );

  return (
    <TabListView
      title="Assigned PRs"
      onBack={onBack}
      status={status}
      items={items}
      error={error}
      onRefresh={() => void refresh()}
      emptyMessage="No open PRs are assigned to you."
    />
  );
}
