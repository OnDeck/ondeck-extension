import { describe, expect, it, vi } from 'vitest';
import { pollNotifications } from '../../src/lib/github-api';

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

describe('pollNotifications', () => {
  it('sends If-Modified-Since and reports a 304 as not modified', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(304, null, { 'x-poll-interval': '60' }));
    global.fetch = fetchMock;

    const result = await pollNotifications('token', { ifModifiedSince: 'Mon, 16 Nov 2026 10:00:00 GMT' });

    expect(result).toEqual({ notModified: true, pollIntervalSeconds: 60 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['If-Modified-Since']).toBe('Mon, 16 Nov 2026 10:00:00 GMT');
    expect(init.cache).toBe('no-store');
  });

  it('reads Last-Modified and X-Poll-Interval from the first page and follows pagination', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(200, [{ id: '1' }], {
          'last-modified': 'LM',
          'x-poll-interval': '120',
          link: '<https://api.github.com/notifications?page=2>; rel="next"',
        }),
      )
      .mockResolvedValueOnce(response(200, [{ id: '2' }]));
    global.fetch = fetchMock;

    const result = await pollNotifications('token', { since: '2026-01-01T00:00:00Z' });

    expect(result).toEqual({
      notModified: false,
      items: [{ id: '1' }, { id: '2' }],
      lastModified: 'LM',
      pollIntervalSeconds: 120,
    });
    expect(fetchMock.mock.calls[0][0]).toContain('since=2026-01-01T00%3A00%3A00Z');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/notifications?page=2');
    expect(fetchMock.mock.calls[0][1].headers['If-Modified-Since']).toBeUndefined();
  });
});
