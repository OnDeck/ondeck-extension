import { useCallback, useEffect, useState } from 'react';

const DISMISSED_STORAGE_KEY = 'gh_workflow_dismissed_v1';

type Namespace = 'reviews' | 'assigned';

type Store = Partial<Record<Namespace, string[]>>;

async function readStore(): Promise<Store> {
  try {
    const bag = await chrome.storage?.local?.get?.(DISMISSED_STORAGE_KEY);
    const stored = bag?.[DISMISSED_STORAGE_KEY] as Store | undefined;
    return stored ?? {};
  } catch {
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  try {
    await chrome.storage?.local?.set?.({ [DISMISSED_STORAGE_KEY]: store });
  } catch {
    // ignore
  }
}

/**
 * Track per-namespace dismissed item ids in chrome.storage.local so the user
 * can hide an item from a tab's list without a server-side mutation.
 */
export function useDismissed(ns: Namespace): {
  ready: boolean;
  isDismissed: (id: number | string) => boolean;
  dismiss: (id: number | string) => Promise<void>;
  clearAll: () => Promise<void>;
} {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await readStore();
      if (cancelled) return;
      setIds(new Set(store[ns] ?? []));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ns]);

  const isDismissed = useCallback((id: number | string) => ids.has(String(id)), [ids]);

  const dismiss = useCallback(
    async (id: number | string) => {
      const next = new Set(ids);
      next.add(String(id));
      setIds(next);
      const store = await readStore();
      store[ns] = Array.from(next);
      await writeStore(store);
    },
    [ids, ns],
  );

  const clearAll = useCallback(async () => {
    setIds(new Set());
    const store = await readStore();
    store[ns] = [];
    await writeStore(store);
  }, [ns]);

  return { ready, isDismissed, dismiss, clearAll };
}
