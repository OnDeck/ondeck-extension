import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import { planMarkRead } from '../../../src/shared/notifications/markRead';

function notif(id: string, unread: boolean, updatedAt: string, repo = 'o/r'): NotificationItem {
  return {
    id,
    unread,
    reason: 'mention',
    updated_at: updatedAt,
    last_read_at: null,
    subject: { title: id, url: null, latest_comment_url: null, type: 'Issue' },
    repository: { id: 1, name: 'r', full_name: repo, owner: { login: 'o', avatar_url: '' } },
  };
}

const visible = [
  notif('1', true, '2026-01-02T10:00:00Z'),
  notif('2', false, '2026-01-03T10:00:00Z'),
  notif('3', true, '2026-01-01T10:00:00Z'),
];

describe('planMarkRead', () => {
  it('does nothing when nothing visible is unread', () => {
    expect(planMarkRead({ visible: [visible[1]], unscoped: true, selectedRepos: [] })).toEqual({ kind: 'none' });
  });

  it('uses the bulk endpoint up to the newest visible timestamp when unscoped', () => {
    expect(planMarkRead({ visible, unscoped: true, selectedRepos: [] })).toEqual({
      kind: 'all',
      lastReadAt: '2026-01-03T10:00:00.000Z',
      count: 2,
    });
  });

  it('scopes the bulk call to the selected repos', () => {
    expect(planMarkRead({ visible, unscoped: true, selectedRepos: ['o/r'] })).toMatchObject({
      kind: 'repos',
      repos: ['o/r'],
      count: 2,
    });
  });

  it('falls back to per-thread marks for reason, search or date filters', () => {
    expect(planMarkRead({ visible, unscoped: false, selectedRepos: ['o/r'] })).toEqual({
      kind: 'threads',
      ids: ['1', '3'],
      count: 2,
    });
  });
});
