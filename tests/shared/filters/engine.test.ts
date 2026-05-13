import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import { applyFilter, extractRepositories } from '../../../src/shared/filters/engine';
import type { PrioritizedNotification } from '../../../src/shared/notifications/grouper';
import type { NotificationPriorityResult } from '../../../src/shared/notifications/prioritizer';

function makeItem(
  overrides: Partial<NotificationItem> & { priorityLevel?: NotificationPriorityResult['level'] },
): PrioritizedNotification {
  const level = overrides.priorityLevel ?? 'normal';
  const priority: NotificationPriorityResult = {
    level,
    reason: level,
    score: level === 'critical' ? 100 : level === 'important' ? 70 : level === 'normal' ? 30 : 5,
  };
  return {
    id: overrides.id ?? '1',
    unread: overrides.unread ?? true,
    reason: overrides.reason ?? 'comment',
    updated_at: new Date().toISOString(),
    last_read_at: null,
    subject: {
      title: overrides.subject?.title ?? 'Test notification',
      url: null,
      latest_comment_url: null,
      type: 'PullRequest',
    },
    repository: overrides.repository ?? {
      id: 1,
      name: 'repo',
      full_name: 'owner/repo',
      owner: { login: 'owner', avatar_url: '' },
    },
    priority,
  };
}

describe('applyFilter', () => {
  it('returns all items for an empty filter', () => {
    const items = [makeItem({ id: '1' }), makeItem({ id: '2' })];
    expect(applyFilter(items, {})).toHaveLength(2);
  });

  it('filters by repository', () => {
    const items = [
      makeItem({ id: '1', repository: { id: 1, name: 'a', full_name: 'owner/a', owner: { login: 'owner', avatar_url: '' } } }),
      makeItem({ id: '2', repository: { id: 2, name: 'b', full_name: 'owner/b', owner: { login: 'owner', avatar_url: '' } } }),
    ];
    const result = applyFilter(items, { repositories: ['owner/a'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by priority', () => {
    const items = [
      makeItem({ id: '1', priorityLevel: 'critical' }),
      makeItem({ id: '2', priorityLevel: 'muted' }),
    ];
    const result = applyFilter(items, { priorities: ['critical'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by reason', () => {
    const items = [
      makeItem({ id: '1', reason: 'review_requested' }),
      makeItem({ id: '2', reason: 'comment' }),
    ];
    const result = applyFilter(items, { reasons: ['review_requested'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters unread-only', () => {
    const items = [
      makeItem({ id: '1', unread: true }),
      makeItem({ id: '2', unread: false }),
    ];
    const result = applyFilter(items, { unreadOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term in title', () => {
    const items = [
      makeItem({ id: '1', subject: { title: 'Fix login bug', url: null, latest_comment_url: null, type: 'Issue' } }),
      makeItem({ id: '2', subject: { title: 'Update dependencies', url: null, latest_comment_url: null, type: 'PullRequest' } }),
    ];
    const result = applyFilter(items, { search: 'login' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term in repository name', () => {
    const items = [
      makeItem({ id: '1', repository: { id: 1, name: 'react', full_name: 'facebook/react', owner: { login: 'facebook', avatar_url: '' } } }),
      makeItem({ id: '2', repository: { id: 2, name: 'next.js', full_name: 'vercel/next.js', owner: { login: 'vercel', avatar_url: '' } } }),
    ];
    const result = applyFilter(items, { search: 'facebook' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('applies multiple filters together (AND semantics)', () => {
    const items = [
      makeItem({ id: '1', unread: true, priorityLevel: 'critical' }),
      makeItem({ id: '2', unread: false, priorityLevel: 'critical' }),
      makeItem({ id: '3', unread: true, priorityLevel: 'muted' }),
    ];
    const result = applyFilter(items, { unreadOnly: true, priorities: ['critical'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('extractRepositories', () => {
  it('returns unique sorted repository names', () => {
    const items = [
      makeItem({ repository: { id: 1, name: 'z', full_name: 'owner/z', owner: { login: 'owner', avatar_url: '' } } }),
      makeItem({ repository: { id: 2, name: 'a', full_name: 'owner/a', owner: { login: 'owner', avatar_url: '' } } }),
      makeItem({ repository: { id: 1, name: 'z', full_name: 'owner/z', owner: { login: 'owner', avatar_url: '' } } }),
    ];
    const repos = extractRepositories(items);
    expect(repos).toEqual(['owner/a', 'owner/z']);
  });
});
