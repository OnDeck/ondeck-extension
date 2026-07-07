/**
 * Helpers for incremental ("delta") notification fetching.
 *
 * Instead of re-pulling the entire inbox on every refresh, callers fetch only
 * notifications updated since the last sync (GitHub's `since` parameter) and
 * merge the result onto what they already hold. This keeps the popup and the
 * background worker focused on *new* activity rather than redownloading
 * everything each time.
 */

/**
 * Merge freshly-fetched notifications into an existing list, de-duplicating by
 * thread id. Incoming items win, so an updated thread (new comment, changed
 * unread state) replaces its stale copy and newly-arrived threads are added.
 *
 * Order is not guaranteed — callers that care re-sort afterwards (the app does
 * this via `prioritizeAll`, which orders by `updated_at`).
 *
 * Note: because an incremental `all=false` fetch only returns threads that are
 * still unread, this merge cannot detect a thread that was read elsewhere and
 * dropped out of the unread set. Callers reconcile those on a full fetch.
 */
export function mergeNotificationsById<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
}

/**
 * Newest `updated_at` (as epoch ms) across a set of notifications, or `null`
 * when the set is empty / has no parseable timestamps.
 *
 * Basing the `since` cursor on a server-provided timestamp (rather than the
 * client clock) guarantees we never skip a notification because of clock skew
 * between the browser and GitHub.
 */
export function latestUpdatedAt(
  items: readonly { updated_at: string }[],
): number | null {
  let max = 0;
  for (const item of items) {
    const t = Date.parse(item.updated_at);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max === 0 ? null : max;
}

/**
 * Overlap buffer (ms) subtracted from the cursor when building a `since` query,
 * so a notification updated in the same instant as the previous sync isn't
 * missed at the boundary. Overlapping items are harmless — the merge de-dupes.
 */
export const SINCE_OVERLAP_MS = 1000;

/**
 * Build the ISO `since` value for an incremental fetch from a cursor timestamp
 * (epoch ms), applying the overlap buffer.
 */
export function sinceFrom(cursorMs: number): string {
  return new Date(Math.max(0, cursorMs - SINCE_OVERLAP_MS)).toISOString();
}
