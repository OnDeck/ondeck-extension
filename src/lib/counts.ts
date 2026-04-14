import { githubSearchCount, githubNotificationsCount } from './github-api';

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

/**
 * Fetch the four headline counts shown on the dashboard home tab.
 * Each request is independent so one failure doesn't block the others.
 */
export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, notifications] = await Promise.all([
    githubSearchCount(`is:pr is:open assignee:${login}`, token).catch(() => 0),
    githubSearchCount(`is:pr is:open review-requested:${login}`, token).catch(() => 0),
    githubSearchCount(`is:open mentions:${login}`, token).catch(() => 0),
    githubNotificationsCount(token).catch(() => 0),
  ]);
  return { assignedPrs, reviewRequests, mentions, notifications };
}
