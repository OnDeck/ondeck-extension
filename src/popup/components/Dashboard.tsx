import {
  listNotifications,
  searchAssignedPrs,
  searchMentions,
  searchReviewRequested,
} from '../../lib/github-api';
import { computeMetrics } from '../../shared/analytics/metrics';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import type { TabId } from '../tabs';
import { Badge } from './Badge';
import { QueryView } from './QueryView';

interface Props {
  token: string;
  login: string;
  onNavigate: (id: TabId) => void;
}

interface DashboardData {
  assigned: number;
  reviews: number;
  mentions: number;
  unread: number;
  criticalCount: number;
  importantCount: number;
  normalCount: number;
  topRepositories: Array<{ repo: string; count: number }>;
}

async function fetchDashboardData(token: string, login: string): Promise<DashboardData> {
  const [assigned, reviews, mentions, rawNotifications] = await Promise.all([
    searchAssignedPrs(token, login),
    searchReviewRequested(token, login),
    searchMentions(token, login),
    listNotifications(token, { all: false }),
  ]);

  const prioritized = prioritizeAll(rawNotifications);
  const metrics = computeMetrics(prioritized);

  return {
    assigned: assigned.total_count,
    reviews: reviews.total_count,
    mentions: mentions.total_count,
    unread: metrics.unread,
    criticalCount: metrics.byPriority.critical,
    importantCount: metrics.byPriority.important,
    normalCount: metrics.byPriority.normal,
    topRepositories: metrics.topRepositories,
  };
}

export function Dashboard({ token, login, onNavigate }: Props) {
  const query = useGitHubQuery(() => fetchDashboardData(token, login), [token, login]);

  return (
    <QueryView query={query}>
      {(data) => (
        <div>
          {/* Primary navigation rows */}
          {(
            [
              { id: 'prs' as TabId, label: 'Assigned PRs', count: data.assigned },
              { id: 'reviews' as TabId, label: 'Review Requests', count: data.reviews },
              { id: 'mentions' as TabId, label: 'Mentions', count: data.mentions },
            ] as const
          ).map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex w-full items-center justify-between border-b border-gh-border-muted px-4 py-3 text-left hover:bg-gh-canvas-subtle"
            >
              <span className="text-xs font-semibold text-gh-fg-default">{label}</span>
              <Badge
                variant="outline"
                tone={count > 0 ? 'accent' : 'muted'}
                className="min-w-[28px] px-2 text-center text-[11px]"
              >
                {count}
              </Badge>
            </button>
          ))}

          {/* Notification priority breakdown */}
          <div className="border-b border-gh-border-muted px-4 py-2">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
              Notifications
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="flex w-full items-center justify-between py-1 hover:text-gh-accent-emphasis"
            >
              <span className="text-xs font-semibold text-gh-fg-default">Unread</span>
              <Badge
                variant="outline"
                tone={data.unread > 0 ? 'accent' : 'muted'}
                className="min-w-[28px] px-2 text-center text-[11px]"
              >
                {data.unread}
              </Badge>
            </button>

            {data.unread > 0 && (
              <div className="mt-1 flex flex-col gap-0.5 pl-3">
                {data.criticalCount > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gh-danger-emphasis">Critical</span>
                    <Badge tone="danger" className="text-[10px]">
                      {data.criticalCount}
                    </Badge>
                  </div>
                )}
                {data.importantCount > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gh-attention-emphasis">Important</span>
                    <Badge tone="attention" className="text-[10px]">
                      {data.importantCount}
                    </Badge>
                  </div>
                )}
                {data.normalCount > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gh-fg-muted">Normal</span>
                    <Badge tone="muted" className="text-[10px]">
                      {data.normalCount}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top active repositories */}
          {data.topRepositories.length > 0 && (
            <div className="px-4 py-2">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                Most Active
              </div>
              <div className="flex flex-col gap-0.5">
                {data.topRepositories.slice(0, 3).map(({ repo, count }) => (
                  <div key={repo} className="flex items-center justify-between text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-gh-fg-default">{repo}</span>
                    <Badge variant="outline" tone="muted" className="ml-2 shrink-0 text-[10px]">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </QueryView>
  );
}
