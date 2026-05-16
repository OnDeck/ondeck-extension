import { describe, expect, it, vi } from 'vitest';
import {
  fetchPullRequestDetails,
  isNotificationForMergedPR,
  type NotificationItem,
} from '../../src/lib/github-api';

describe('fetchPullRequestDetails', () => {
  it('returns PR details for valid subject URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: 'closed',
        merged: true,
        merged_at: '2024-01-15T10:30:00Z',
      }),
    });
    global.fetch = mockFetch;

    const result = await fetchPullRequestDetails(
      'token',
      'https://api.github.com/repos/owner/repo/pulls/123',
    );

    expect(result).toEqual({
      state: 'closed',
      merged: true,
      merged_at: '2024-01-15T10:30:00Z',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/pulls/123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('returns null for invalid subject URL', async () => {
    const result = await fetchPullRequestDetails('token', 'invalid-url');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const result = await fetchPullRequestDetails(
      'token',
      'https://api.github.com/repos/owner/repo/pulls/123',
    );

    expect(result).toBeNull();
  });
});

describe('isNotificationForMergedPR', () => {
  it('returns true for merged PR notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: 'closed',
        merged: true,
        merged_at: '2024-01-15T10:30:00Z',
      }),
    });
    global.fetch = mockFetch;

    const notification: NotificationItem = {
      id: '1',
      unread: true,
      reason: 'review_requested',
      updated_at: '2024-01-15T10:00:00Z',
      last_read_at: null,
      subject: {
        title: 'Test PR',
        url: 'https://api.github.com/repos/owner/repo/pulls/123',
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

    const result = await isNotificationForMergedPR('token', notification);
    expect(result).toBe(true);
  });

  it('returns false for open PR notification', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: 'open',
        merged: false,
        merged_at: null,
      }),
    });
    global.fetch = mockFetch;

    const notification: NotificationItem = {
      id: '1',
      unread: true,
      reason: 'review_requested',
      updated_at: '2024-01-15T10:00:00Z',
      last_read_at: null,
      subject: {
        title: 'Test PR',
        url: 'https://api.github.com/repos/owner/repo/pulls/123',
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

    const result = await isNotificationForMergedPR('token', notification);
    expect(result).toBe(false);
  });

  it('returns false for non-PR notification', async () => {
    const notification: NotificationItem = {
      id: '1',
      unread: true,
      reason: 'mention',
      updated_at: '2024-01-15T10:00:00Z',
      last_read_at: null,
      subject: {
        title: 'Test Issue',
        url: 'https://api.github.com/repos/owner/repo/issues/123',
        latest_comment_url: null,
        type: 'Issue',
      },
      repository: {
        id: 1,
        name: 'repo',
        full_name: 'owner/repo',
        owner: { login: 'owner', avatar_url: '' },
      },
    };

    const result = await isNotificationForMergedPR('token', notification);
    expect(result).toBe(false);
  });

  it('returns false when subject URL is null', async () => {
    const notification: NotificationItem = {
      id: '1',
      unread: true,
      reason: 'review_requested',
      updated_at: '2024-01-15T10:00:00Z',
      last_read_at: null,
      subject: {
        title: 'Test PR',
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

    const result = await isNotificationForMergedPR('token', notification);
    expect(result).toBe(false);
  });
});
