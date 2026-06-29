import { describe, expect, it, beforeEach, vi } from 'vitest';
import { showDesktopNotifications } from '../../../src/background/workers/desktop-notifications';
import type { NotificationItem, NotificationReason } from '../../../src/lib/github-api';
import type { UserSettings } from '../../../src/shared/settings/types';

const createMock = vi.fn().mockResolvedValue('notif-id');

global.chrome = {
  notifications: { create: createMock },
  runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
} as unknown as typeof chrome;

function makeNotification(
  overrides: Partial<NotificationItem> & { reason?: NotificationReason } = {},
): NotificationItem {
  return {
    id: overrides.id ?? '1',
    unread: true,
    reason: overrides.reason ?? 'mention',
    updated_at: '2024-01-15T10:00:00Z',
    last_read_at: null,
    subject: {
      title: overrides.subject?.title ?? 'Test notification',
      url: null,
      latest_comment_url: null,
      type: 'PullRequest',
    },
    repository: {
      id: 1,
      name: 'repo',
      full_name: overrides.repository?.full_name ?? 'owner/repo',
      owner: { login: 'owner', avatar_url: '' },
    },
  };
}

const ALL_REASONS: UserSettings['notifications']['reasons'] = [
  'assign',
  'mention',
  'review_requested',
  'team_mention',
  'security_alert',
];

function settings(
  overrides: Partial<UserSettings['notifications']> = {},
): UserSettings['notifications'] {
  return { enabled: true, sound: false, reasons: ALL_REASONS, ...overrides };
}

describe('showDesktopNotifications', () => {
  beforeEach(() => createMock.mockClear());

  it('does nothing when notifications are disabled', async () => {
    await showDesktopNotifications([makeNotification()], settings({ enabled: false }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('does nothing when there are no new notifications', async () => {
    await showDesktopNotifications([], settings());
    expect(createMock).not.toHaveBeenCalled();
  });

  it('skips notifications whose reason is not selected', async () => {
    await showDesktopNotifications(
      [makeNotification({ reason: 'mention' })],
      settings({ reasons: ['assign'] }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('shows a single notification using the subject title', async () => {
    await showDesktopNotifications(
      [makeNotification({ subject: { title: 'Fix the bug' } } as Partial<NotificationItem>)],
      settings(),
    );
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fix the bug', silent: true }),
    );
  });

  it('groups multiple notifications per repository into one alert', async () => {
    await showDesktopNotifications(
      [
        makeNotification({ id: '1' }),
        makeNotification({ id: '2' }),
        makeNotification({ id: '3', repository: { full_name: 'other/repo' } } as Partial<NotificationItem>),
      ],
      settings(),
    );
    // owner/repo (2 grouped) + other/repo (1) = 2 create calls
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '2 new notifications in owner/repo' }),
    );
  });

  it('respects the sound setting via the silent flag', async () => {
    await showDesktopNotifications([makeNotification()], settings({ sound: true }));
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ silent: false }));
  });

  it('elevates priority and requires interaction for security alerts', async () => {
    await showDesktopNotifications(
      [makeNotification({ reason: 'security_alert' })],
      settings(),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 2, requireInteraction: true }),
    );
  });
});
