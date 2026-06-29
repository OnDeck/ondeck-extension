import { describe, expect, it, vi } from 'vitest';
import { listNotificationsPage } from '../../src/lib/github-api';

function mockResponse(items: unknown[], link?: string) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'link' ? link ?? null : null) },
    json: async () => items,
  };
}

describe('listNotificationsPage', () => {
  it('returns items and extracts the next-page cursor as a relative path', async () => {
    const link =
      '<https://api.github.com/notifications?page=2>; rel="next", ' +
      '<https://api.github.com/notifications?page=5>; rel="last"';
    global.fetch = vi.fn().mockResolvedValue(mockResponse([{ id: '1' }, { id: '2' }], link));

    const page = await listNotificationsPage('token', { all: true });

    expect(page.items).toHaveLength(2);
    expect(page.nextUrl).toBe('/notifications?page=2');
  });

  it('returns nextUrl=null on the last page (no rel="next")', async () => {
    const link = '<https://api.github.com/notifications?page=1>; rel="first"';
    global.fetch = vi.fn().mockResolvedValue(mockResponse([{ id: '1' }], link));

    const page = await listNotificationsPage('token', { all: true });

    expect(page.nextUrl).toBeNull();
  });

  it('returns nextUrl=null when there is no Link header', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockResponse([{ id: '1' }]));

    const page = await listNotificationsPage('token');

    expect(page.nextUrl).toBeNull();
  });

  it('fetches the provided pageUrl when paginating', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([], undefined));
    global.fetch = fetchMock;

    await listNotificationsPage('token', { pageUrl: '/notifications?page=3' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/notifications?page=3',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });
});
