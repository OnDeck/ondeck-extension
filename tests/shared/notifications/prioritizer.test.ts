import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import {
  prioritizeAll,
  prioritizeNotification,
} from '../../../src/shared/notifications/prioritizer';

function makeItem(
  reason: NotificationItem['reason'],
  id = '1',
  unread = true,
): NotificationItem {
  return {
    id,
    unread,
    reason,
    updated_at: new Date().toISOString(),
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
  it('assigns critical to review_requested', () => {
    const result = prioritizeNotification(makeItem('review_requested'));
    expect(result.level).toBe('critical');
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('assigns critical to security_alert', () => {
    const result = prioritizeNotification(makeItem('security_alert'));
    expect(result.level).toBe('critical');
  });

  it('assigns important to assign', () => {
    const result = prioritizeNotification(makeItem('assign'));
    expect(result.level).toBe('important');
  });

  it('assigns important to mention', () => {
    const result = prioritizeNotification(makeItem('mention'));
    expect(result.level).toBe('important');
  });

  it('assigns important to team_mention', () => {
    const result = prioritizeNotification(makeItem('team_mention'));
    expect(result.level).toBe('important');
  });

  it('assigns normal to ci_activity', () => {
    const result = prioritizeNotification(makeItem('ci_activity'));
    expect(result.level).toBe('normal');
  });

  it('assigns normal to comment', () => {
    const result = prioritizeNotification(makeItem('comment'));
    expect(result.level).toBe('normal');
  });

  it('assigns muted to subscribed', () => {
    const result = prioritizeNotification(makeItem('subscribed'));
    expect(result.level).toBe('muted');
  });

  it('assigns muted to push', () => {
    const result = prioritizeNotification(makeItem('push'));
    expect(result.level).toBe('muted');
  });

  it('includes a human-readable reason string', () => {
    const result = prioritizeNotification(makeItem('review_requested'));
    expect(result.reason).toBe('Review requested');
  });
});

describe('prioritizeAll', () => {
  it('sorts by descending score', () => {
    const items = [
      makeItem('subscribed', '1'),
      makeItem('review_requested', '2'),
      makeItem('comment', '3'),
    ];
    const result = prioritizeAll(items);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
  });

  it('attaches priority to each item', () => {
    const [item] = prioritizeAll([makeItem('mention')]);
    expect(item.priority.level).toBe('important');
    expect(typeof item.priority.score).toBe('number');
  });
});
