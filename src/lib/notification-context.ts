/**
 * Fetch additional context for notifications to show detailed reasons
 * like "Changes requested", "Approved", etc.
 */

import type { NotificationItem } from './github-api';

export interface NotificationContext {
  primaryReason: string;
  actor?: string;
  reviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
}

interface GitHubComment {
  user: {
    login: string;
  };
  body?: string;
  state?: string;
}

interface GitHubReview {
  user: {
    login: string;
  };
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body: string;
  submitted_at: string;
}

async function fetchLatestComment(
  token: string,
  url: string,
): Promise<GitHubComment | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get enhanced notification context with specific action details
 */
export async function getNotificationContext(
  token: string,
  notification: NotificationItem,
): Promise<NotificationContext> {
  const baseReason = getBaseReason(notification.reason);

  // For PR review requests, check if there's a review with changes requested
  if (
    notification.reason === 'review_requested' ||
    notification.reason === 'author' ||
    notification.reason === 'comment'
  ) {
    if (notification.subject.latest_comment_url) {
      const comment = await fetchLatestComment(
        token,
        notification.subject.latest_comment_url,
      );

      if (comment) {
        // Check if it's a review with a state
        const review = comment as GitHubReview;
        if (review.state) {
          return {
            primaryReason: getReviewStateLabel(review.state),
            actor: review.user.login,
            reviewState: review.state,
          };
        }

        // Regular comment
        return {
          primaryReason: 'New comment',
          actor: comment.user.login,
        };
      }
    }
  }

  return { primaryReason: baseReason };
}

function getReviewStateLabel(state: string): string {
  switch (state) {
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'COMMENTED':
      return 'Reviewed';
    case 'DISMISSED':
      return 'Review dismissed';
    default:
      return 'Reviewed';
  }
}

function getBaseReason(reason: string): string {
  const labels: Record<string, string> = {
    review_requested: 'Review requested',
    security_alert: 'Security alert',
    assign: 'Assigned to you',
    mention: 'You were mentioned',
    team_mention: 'Team mention',
    ci_activity: 'CI activity',
    author: 'Updated',
    comment: 'New comment',
    state_change: 'State changed',
    push: 'New push',
    invitation: 'Invitation',
    manual: 'Subscribed',
    subscribed: 'Subscribed',
  };

  return labels[reason] ?? reason.replace(/_/g, ' ');
}

/**
 * Batch fetch context for multiple notifications efficiently
 */
export async function batchGetNotificationContext(
  token: string,
  notifications: NotificationItem[],
): Promise<Map<string, NotificationContext>> {
  const contextMap = new Map<string, NotificationContext>();

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (notif) => ({
        id: notif.id,
        context: await getNotificationContext(token, notif),
      })),
    );

    results.forEach(({ id, context }) => {
      contextMap.set(id, context);
    });
  }

  return contextMap;
}
