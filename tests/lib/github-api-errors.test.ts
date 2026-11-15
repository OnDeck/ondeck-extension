import { describe, expect, it, vi } from 'vitest';
import { fetchViewer, GitHubApiError } from '../../src/lib/github-api';

function mockResponse(status: number, headers: Record<string, string> = {}) {
  return {
    ok: status < 400,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => ({}),
  };
}

async function errorFor(status: number, headers?: Record<string, string>) {
  global.fetch = vi.fn().mockResolvedValue(mockResponse(status, headers));
  return fetchViewer('token').catch((e: unknown) => e as GitHubApiError);
}

describe('githubFetch error mapping', () => {
  it('treats a 403 with no remaining quota as a rate limit, not a scope problem', async () => {
    const resetAt = String(Math.floor(Date.now() / 1000) + 120);
    const err = await errorFor(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': resetAt });
    expect(err).toBeInstanceOf(GitHubApiError);
    expect((err as GitHubApiError).kind).toBe('rate_limited');
    expect((err as GitHubApiError).message).toMatch(/2 min/);
  });

  it('treats a secondary rate limit (retry-after) as a rate limit', async () => {
    const err = await errorFor(403, { 'retry-after': '30' });
    expect((err as GitHubApiError).kind).toBe('rate_limited');
  });

  it('treats 429 as a rate limit', async () => {
    const err = await errorFor(429);
    expect((err as GitHubApiError).kind).toBe('rate_limited');
  });

  it('keeps a plain 403 as forbidden', async () => {
    const err = await errorFor(403, { 'x-ratelimit-remaining': '4999' });
    expect((err as GitHubApiError).kind).toBe('forbidden');
  });

  it('maps 401 to unauthorized', async () => {
    const err = await errorFor(401);
    expect((err as GitHubApiError).kind).toBe('unauthorized');
  });
});
