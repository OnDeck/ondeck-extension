import { GitHubApiError, GITHUB_API_BASE } from './github-api';

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention';

export type NotificationSubjectType = 'PullRequest' | 'Issue' | 'Discussion' | 'Release' | 'Commit';

export interface RawNotification {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: NotificationSubjectType;
  };
  repository: {
    id: number;
    full_name: string;
    html_url: string;
  };
}

export interface NotificationGroup {
  repo: string;
  repoUrl: string;
  items: RawNotification[];
}

async function ghFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new GitHubApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'network',
    );
  }
  if (res.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  if (res.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  if (!res.ok && res.status !== 205) {
    throw new GitHubApiError(`GitHub API error (${res.status})`, res.status, 'other');
  }
  return res;
}

export async function fetchNotifications(token: string): Promise<RawNotification[]> {
  const res = await ghFetch('/notifications?all=false&per_page=50', token);
  return (await res.json()) as RawNotification[];
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await ghFetch(`/notifications/threads/${id}`, token, { method: 'PATCH' });
}

export function groupByRepo(items: RawNotification[]): NotificationGroup[] {
  const map = new Map<string, NotificationGroup>();
  for (const item of items) {
    const key = item.repository.full_name;
    let group = map.get(key);
    if (!group) {
      group = { repo: key, repoUrl: item.repository.html_url, items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.repo.localeCompare(b.repo));
}

export function htmlUrlForSubject(item: RawNotification): string {
  // The notifications API returns api.github.com URLs; convert to github.com.
  const apiUrl = item.subject.latest_comment_url ?? item.subject.url;
  if (!apiUrl) return item.repository.html_url;
  return apiUrl
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/')
    .replace(/\/comments\/\d+$/, '');
}
