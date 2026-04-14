import { useIssueList } from '../../hooks/useIssueList';
import { IssueRow } from '../IssueRow';
import { TabShell } from './TabShell';

interface Props {
  token: string | null;
  login: string | null;
}

const BLOCKING_LABEL = /block(ing|er)?|urgent|p0|p1/i;

export function ReviewsTab({ token, login }: Props) {
  const query = login ? `is:pr is:open review-requested:${login}` : null;
  const list = useIssueList(token, query);

  return (
    <TabShell
      title="Review requests"
      status={list.status}
      error={list.error}
      isEmpty={list.items.length === 0}
      emptyMessage="No reviews waiting on you."
      onRefresh={() => void list.refresh()}
    >
      <ul>
        {list.items.map((item) => {
          const blocking = item.labels.some((l) => BLOCKING_LABEL.test(l.name ?? ''));
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
                item.user?.avatar_url ? (
                  <img
                    src={item.user.avatar_url}
                    alt={item.user.login}
                    title={`Requested by @${item.user.login}`}
                    className="h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                  />
                ) : null
              }
            />
          );
        })}
      </ul>
    </TabShell>
  );
}
