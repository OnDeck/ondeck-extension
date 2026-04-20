import {
  listNotifications,
  searchAssignedPrs,
  searchMentions,
  searchReviewRequested,
} from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import type { TabId } from '../tabs';
import { Badge } from './Badge';
import { QueryView } from './QueryView';

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

interface Row {
  id: TabId;
  label: string;
  count: number;
}

const ZERO_COUNTS: Counts = {
  assigned: 0,
  reviews: 0,
  mentions: 0,
  notifications: 0,
};

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

function rowsFromCounts(counts: Counts): Row[] {
  return [
    { id: 'prs', label: 'Assigned PRs', count: counts.assigned },
    { id: 'reviews', label: 'Review Requests', count: counts.reviews },
    { id: 'mentions', label: 'Mentions', count: counts.mentions },
    { id: 'notifications', label: 'Unread Notifications', count: counts.notifications },
  ];
}

export function Dashboard({ token, login, onNavigate }: Props) {
  const query = useGitHubQuery(() => fetchCounts(token, login), [token, login]);

  return (
    <QueryView query={query}>
      {(data) => {
        const rows = rowsFromCounts(data ?? ZERO_COUNTS);
        return (
          <div>
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onNavigate(row.id)}
                className="flex w-full items-center justify-between border-b border-gh-border-muted px-4 py-3 text-left last:border-b-0 hover:bg-gh-canvas-subtle"
              >
                <span className="text-xs font-semibold text-gh-fg-default">
                  {row.label}
                </span>
                <Badge
                  variant="outline"
                  tone={row.count > 0 ? 'accent' : 'muted'}
                  className="min-w-[28px] px-2 text-center text-[11px]"
                >
                  {row.count}
                </Badge>
              </button>
            ))}
          </div>
        );
      }}
    </QueryView>
  );
}
