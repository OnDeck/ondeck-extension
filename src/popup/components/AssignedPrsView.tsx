import { IssueListView } from './IssueListView';

interface Props {
  active: boolean;
}

export function AssignedPrsView({ active }: Props) {
  return (
    <IssueListView
      active={active}
      title="Assigned PRs"
      query="assignedPrs"
      emptyMessage="No open PRs are assigned to you. You're clear!"
    />
  );
}
