import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem } from '../../../src/lib/github-api';
import { memoryStorageArea } from '../../helpers/chromeStorage';

const pollNotifications = vi.fn();
const showDesktopNotifications = vi.fn();
const getStoredAuth = vi.fn();

vi.mock('../../../src/lib/auth', () => ({ getStoredAuth: () => getStoredAuth() }));
vi.mock('../../../src/lib/github-api', () => ({
  pollNotifications: (...args: unknown[]) => pollNotifications(...args),
}));
vi.mock('../../../src/background/workers/desktop-notifications', () => ({
  showDesktopNotifications: (...args: unknown[]) => showDesktopNotifications(...args),
}));

const { syncNotifications } = await import('../../../src/background/workers/sync');

const local = memoryStorageArea();
const sync = memoryStorageArea();
const setBadgeText = vi.fn().mockResolvedValue(undefined);
const sendMessage = vi.fn().mockResolvedValue(undefined);

global.chrome = {
  storage: { local, sync },
  action: { setBadgeText, setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined) },
  runtime: { sendMessage },
} as unknown as typeof chrome;

function notif(id: string, updatedAt = '2026-01-01T00:00:00Z'): NotificationItem {
  return {
    id,
    unread: true,
    reason: 'mention',
    updated_at: updatedAt,
    last_read_at: null,
    subject: { title: `n${id}`, url: null, latest_comment_url: null, type: 'Issue' },
    repository: { id: 1, name: 'r', full_name: 'o/r', owner: { login: 'o', avatar_url: '' } },
  };
}

function fresh(
  items: NotificationItem[],
  { lastModified = 'Mon, 16 Nov 2026 10:00:00 GMT', pollIntervalSeconds = null as number | null } = {},
) {
  return { notModified: false, items, lastModified, pollIntervalSeconds };
}

function alertedIds(): string[] {
  const [items] = showDesktopNotifications.mock.calls.at(-1) as [NotificationItem[]];
  return items.map((n) => n.id);
}

describe('syncNotifications', () => {
  beforeEach(() => {
    local.clear();
    sync.clear();
    vi.clearAllMocks();
    getStoredAuth.mockResolvedValue({ token: 't', viewer: { login: 'me' } });
  });

  it('records a baseline on the first sync without alerting', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1'), notif('2')]));
    await syncNotifications();
    expect(showDesktopNotifications).not.toHaveBeenCalled();
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '2' });
  });

  it('alerts after an inbox-zero sync (empty baseline still counts)', async () => {
    pollNotifications.mockResolvedValue(fresh([]));
    await syncNotifications();
    pollNotifications.mockResolvedValue(fresh([notif('1')]));
    await syncNotifications();
    expect(alertedIds()).toEqual(['1']);
  });

  it('alerts on new activity in a thread that was already unread', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1', '2026-01-01T00:00:00Z')]));
    await syncNotifications();
    pollNotifications.mockResolvedValue(fresh([notif('1', '2026-01-02T00:00:00Z')]));
    await syncNotifications();
    expect(alertedIds()).toEqual(['1']);
  });

  it('does not re-alert unchanged notifications', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1')]));
    await syncNotifications();
    await syncNotifications();
    expect(showDesktopNotifications).not.toHaveBeenCalled();
  });

  it('caps the badge text at 99+', async () => {
    pollNotifications.mockResolvedValue(fresh(Array.from({ length: 120 }, (_, i) => notif(String(i)))));
    await syncNotifications();
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '99+' });
  });

  it('clears the badge when signed out', async () => {
    getStoredAuth.mockResolvedValue({ token: null, viewer: null });
    await syncNotifications();
    expect(pollNotifications).not.toHaveBeenCalled();
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });

  it('fetches incrementally after a full sync and merges onto the cache', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1', '2026-01-01T00:00:00Z')]));
    await syncNotifications({ full: true });
    expect(pollNotifications.mock.calls[0][1]).toEqual({ since: undefined, ifModifiedSince: undefined });

    pollNotifications.mockResolvedValue(fresh([notif('2', '2026-01-02T00:00:00Z')]));
    await syncNotifications();
    expect(pollNotifications.mock.calls[1][1].since).toBe('2025-12-31T23:59:59.000Z');
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '2' });
  });

  it('reconciles in full once the last full sync is stale, pruning threads read elsewhere', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1'), notif('2')]));
    await syncNotifications({ full: true });

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31 * 60 * 1000);
    pollNotifications.mockResolvedValue(fresh([notif('2')]));
    await syncNotifications();
    vi.useRealTimers();

    expect(pollNotifications.mock.calls[1][1].since).toBeUndefined();
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '1' });
  });

  it('makes incremental syncs conditional and treats a 304 as no change', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1'), notif('2')], { lastModified: 'LM-1' }));
    await syncNotifications({ full: true });
    setBadgeText.mockClear();

    pollNotifications.mockResolvedValue({ notModified: true, pollIntervalSeconds: null });
    await syncNotifications();

    expect(pollNotifications.mock.calls[1][1].ifModifiedSince).toBe('LM-1');
    expect(showDesktopNotifications).not.toHaveBeenCalled();
    expect(setBadgeText).toHaveBeenLastCalledWith({ text: '2' });
  });

  it('never sends If-Modified-Since on a full reconcile', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1')], { lastModified: 'LM-1' }));
    await syncNotifications({ full: true });
    await syncNotifications({ full: true });
    expect(pollNotifications.mock.calls[1][1].ifModifiedSince).toBeUndefined();
  });

  it('waits out X-Poll-Interval for incremental syncs but not reconciles', async () => {
    pollNotifications.mockResolvedValue(fresh([notif('1')], { pollIntervalSeconds: 60 }));
    await syncNotifications({ full: true });
    await syncNotifications();
    expect(pollNotifications).toHaveBeenCalledTimes(1);

    await syncNotifications({ full: true });
    expect(pollNotifications).toHaveBeenCalledTimes(2);
  });
});
