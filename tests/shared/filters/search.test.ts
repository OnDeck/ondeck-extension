import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import { isEmptySearch, matchesSearch, parseSearch } from '../../../src/shared/filters/search';

function notif(overrides: Partial<{ repo: string; type: string; reason: string; title: string; unread: boolean }> = {}): NotificationItem {
  const repo = overrides.repo ?? 'acme/web';
  return {
    id: '1',
    unread: overrides.unread ?? true,
    reason: (overrides.reason ?? 'mention') as NotificationItem['reason'],
    updated_at: '2026-01-01T00:00:00Z',
    last_read_at: null,
    subject: { title: overrides.title ?? 'Fix checkout retry', url: null, latest_comment_url: null, type: overrides.type ?? 'PullRequest' },
    repository: { id: 1, name: repo.split('/')[1], full_name: repo, owner: { login: 'acme', avatar_url: '' } },
  };
}

const matches = (query: string, item: NotificationItem) => matchesSearch(item, parseSearch(query));

describe('parseSearch / matchesSearch', () => {
  it('matches free text against the title and repo, all terms required', () => {
    expect(matches('checkout', notif())).toBe(true);
    expect(matches('acme/web', notif())).toBe(true);
    expect(matches('checkout banana', notif())).toBe(false);
    expect(matches('CHECKOUT', notif())).toBe(true);
  });

  it('supports quoted phrases', () => {
    expect(matches('"checkout retry"', notif())).toBe(true);
    expect(matches('"retry checkout"', notif())).toBe(false);
  });

  it('filters by repo, including partial names', () => {
    expect(matches('repo:web', notif())).toBe(true);
    expect(matches('repo:acme/api', notif())).toBe(false);
    expect(matches('repo:api repo:web', notif())).toBe(true);
  });

  it('filters by read state', () => {
    expect(matches('is:unread', notif({ unread: true }))).toBe(true);
    expect(matches('is:unread', notif({ unread: false }))).toBe(false);
    expect(matches('is:read', notif({ unread: false }))).toBe(true);
  });

  it('filters by type with aliases, and an unknown type matches nothing', () => {
    expect(matches('type:pr', notif({ type: 'PullRequest' }))).toBe(true);
    expect(matches('type:issue', notif({ type: 'PullRequest' }))).toBe(false);
    expect(matches('type:ci', notif({ type: 'CheckSuite' }))).toBe(true);
    expect(matches('type:Release', notif({ type: 'Release' }))).toBe(true);
    expect(matches('type:nonsense', notif())).toBe(false);
  });

  it('filters by reason with aliases', () => {
    expect(matches('reason:review', notif({ reason: 'review_requested' }))).toBe(true);
    expect(matches('reason:mention', notif({ reason: 'team_mention' }))).toBe(true);
    expect(matches('reason:assign', notif({ reason: 'mention' }))).toBe(false);
    expect(matches('reason:security_alert', notif({ reason: 'security_alert' }))).toBe(true);
  });

  it('combines operators and text with AND', () => {
    const item = notif({ repo: 'acme/api', type: 'Issue', reason: 'mention', title: 'Rate limiter drops requests' });
    expect(matches('repo:api type:issue reason:mention rate', item)).toBe(true);
    expect(matches('repo:api type:pr rate', item)).toBe(false);
  });

  it('treats unknown operators as text and spots empty searches', () => {
    expect(parseSearch('foo:bar').terms).toEqual(['foo:bar']);
    expect(isEmptySearch(parseSearch('   '))).toBe(true);
    expect(isEmptySearch(parseSearch('is:unread'))).toBe(false);
  });
});
