import { describe, expect, it } from 'vitest';
import {
  mergeNotificationsById,
  latestUpdatedAt,
  sinceFrom,
  SINCE_OVERLAP_MS,
} from '../../../src/shared/notifications/merge';

describe('mergeNotificationsById', () => {
  it('adds newly-arrived items to the existing set', () => {
    const existing = [{ id: '1' }, { id: '2' }];
    const incoming = [{ id: '3' }];
    const merged = mergeNotificationsById(existing, incoming);
    expect(merged.map((n) => n.id).sort()).toEqual(['1', '2', '3']);
  });

  it('replaces an existing item with the incoming (updated) copy', () => {
    const existing = [{ id: '1', unread: true }];
    const incoming = [{ id: '1', unread: false }];
    const merged = mergeNotificationsById(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].unread).toBe(false);
  });

  it('does not mutate its inputs', () => {
    const existing = [{ id: '1' }];
    const incoming = [{ id: '2' }];
    mergeNotificationsById(existing, incoming);
    expect(existing).toEqual([{ id: '1' }]);
    expect(incoming).toEqual([{ id: '2' }]);
  });

  it('returns a copy of existing when incoming is empty', () => {
    const existing = [{ id: '1' }, { id: '2' }];
    expect(mergeNotificationsById(existing, [])).toEqual(existing);
  });
});

describe('latestUpdatedAt', () => {
  it('returns the newest timestamp as epoch ms', () => {
    const items = [
      { updated_at: '2024-01-01T00:00:00Z' },
      { updated_at: '2024-01-03T00:00:00Z' },
      { updated_at: '2024-01-02T00:00:00Z' },
    ];
    expect(latestUpdatedAt(items)).toBe(Date.parse('2024-01-03T00:00:00Z'));
  });

  it('returns null for an empty list', () => {
    expect(latestUpdatedAt([])).toBeNull();
  });

  it('ignores unparseable timestamps', () => {
    const items = [{ updated_at: 'not-a-date' }, { updated_at: '2024-01-01T00:00:00Z' }];
    expect(latestUpdatedAt(items)).toBe(Date.parse('2024-01-01T00:00:00Z'));
  });
});

describe('sinceFrom', () => {
  it('subtracts the overlap buffer and returns an ISO string', () => {
    const cursor = Date.parse('2024-01-01T00:00:10Z');
    expect(sinceFrom(cursor)).toBe(
      new Date(cursor - SINCE_OVERLAP_MS).toISOString(),
    );
  });

  it('never produces a negative timestamp', () => {
    expect(sinceFrom(0)).toBe(new Date(0).toISOString());
  });
});
