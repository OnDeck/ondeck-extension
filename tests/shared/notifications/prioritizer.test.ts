import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import {
  prioritizeAll,
  prioritizeNotification,
} from '../../../src/shared/notifications/prioritizer';

function makeItem(
  reason: NotificationItem['reason'],
  id = '1',
  updatedAt = new Date().toISOString(),
  unread = true,
): NotificationItem {
  return {
    id,
    unread,
    reason,
    updated_at: updatedAt,
    last_read_at: null,
    subject: {
      title: `Test notification ${id}`,
      url: null,
      latest_comment_url: null,
      type: 'PullRequest',
    },
    repository: {
      id: 1,
      name: 'repo',
      full_name: 'owner/repo',
      owner: { login: 'owner', avatar_url: '' },
    },
  };
}

describe('prioritizeNotification', () => {
  // The priority system was removed (see "remove priority system and add
  // settings controls"); every notification now resolves to a single
  // 'normal' level with a zero score, and ordering is driven by recency.
  it.each([
    'review_requested',
    'security_alert',
    'assign',
    'mention',
    'team_mention',
    'ci_activity',
    'comment',
    'subscribed',
    'push',
  ] as const)('assigns the normal level to %s', (reason) => {
    const result = prioritizeNotification(makeItem(reason));
    expect(result.level).toBe('normal');
    expect(result.score).toBe(0);
  });

  it('includes a human-readable reason string', () => {
    const result = prioritizeNotification(makeItem('review_requested'));
    expect(result.reason).toBe('Review requested');
  });

  it('falls back to a de-underscored label for unknown reasons', () => {
    const item = makeItem('something_new' as NotificationItem['reason']);
    expect(prioritizeNotification(item).reason).toBe('something new');
  });
});

describe('prioritizeAll', () => {
  it('sorts by most recently updated first', () => {
    const items = [
      makeItem('subscribed', '1', '2024-01-01T00:00:00Z'),
      makeItem('review_requested', '2', '2024-01-03T00:00:00Z'),
      makeItem('comment', '3', '2024-01-02T00:00:00Z'),
    ];
    const result = prioritizeAll(items);
    expect(result.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('attaches a priority result to each item', () => {
    const [item] = prioritizeAll([makeItem('mention')]);
    expect(item.priority.level).toBe('normal');
    expect(typeof item.priority.score).toBe('number');
  });
});
