import {
  listNotifications,
  searchAssignedPrs,
  searchMentions,
  searchReviewRequested,
} from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import type { TabId } from '../tabs';
import { ErrorState, Spinner } from './States';

interface Props {
  token: string;
  login: string;
  onNavigate: (id: TabId) => void;
}

interface Counts {
  assigned: number;
  reviews: number;
  mentions: number;
  notifications: number;
}

async function fetchCounts(token: string, login: string): Promise<Counts> {
  const [assigned, reviews, mentions, notifications] = await Promise.all([
    searchAssignedPrs(token, login),
    searchReviewRequested(token, login),
    searchMentions(token, login),
    listNotifications(token, { all: false }),
  ]);
  return {
    assigned: assigned.total_count,
    reviews: reviews.total_count,
    mentions: mentions.total_count,
    notifications: notifications.length,
  };
}

interface Row {
  id: TabId;
  label: string;
  count: number;
}

export function Dashboard({ token, login, onNavigate }: Props) {
  const query = useGitHubQuery(() => fetchCounts(token, login), [token, login]);

  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;

  const counts = query.data ?? { assigned: 0, reviews: 0, mentions: 0, notifications: 0 };
  const rows: Row[] = [
    { id: 'prs', label: 'Assigned PRs', count: counts.assigned },
    { id: 'reviews', label: 'Review Requests', count: counts.reviews },
    { id: 'mentions', label: 'Mentions', count: counts.mentions },
    { id: 'notifications', label: 'Unread Notifications', count: counts.notifications },
  ];

  return (
    <div>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onNavigate(row.id)}
          className="flex w-full items-center justify-between border-b border-gh-border-muted px-4 py-3 text-left last:border-b-0 hover:bg-gh-canvas-subtle"
        >
          <span className="text-xs font-semibold text-gh-fg-default">{row.label}</span>
          <span
            className={
              'min-w-[28px] rounded-full border px-2 py-0.5 text-center text-[11px] font-semibold ' +
              (row.count > 0
                ? 'border-gh-accent-emphasis/40 bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                : 'border-gh-border-default text-gh-fg-muted')
            }
          >
            {row.count}
          </span>
        </button>
      ))}
    </div>
  );
}
