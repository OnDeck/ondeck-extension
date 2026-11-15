import { NOTIFICATIONS_CACHE_KEY } from '../constants';
import type { PrioritizedNotification } from './grouper';

/** Unread inbox maintained by the background worker in chrome.storage.local. */
export interface NotificationCache {
  items: PrioritizedNotification[];
  fetchedAt: number;
  lastFullSyncAt?: number;
}

function isNotificationCache(value: unknown): value is NotificationCache {
  if (typeof value !== 'object' || value === null) return false;
  const cache = value as Record<string, unknown>;
  return Array.isArray(cache.items) && typeof cache.fetchedAt === 'number';
}

export async function readNotificationCache(): Promise<NotificationCache | undefined> {
  const bag = await chrome.storage.local.get(NOTIFICATIONS_CACHE_KEY);
  const cache: unknown = bag[NOTIFICATIONS_CACHE_KEY];
  return isNotificationCache(cache) ? cache : undefined;
}

export async function writeNotificationCache(cache: NotificationCache): Promise<void> {
  await chrome.storage.local.set({ [NOTIFICATIONS_CACHE_KEY]: cache });
}
