import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'gh_workflow_dismissed_v1:';

export function useDismissed(namespace: string) {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void chrome.storage.local.get(KEY_PREFIX + namespace).then((bag) => {
      if (cancelled) return;
      const list = (bag[KEY_PREFIX + namespace] as number[] | undefined) ?? [];
      setIds(new Set(list));
    });
    return () => {
      cancelled = true;
    };
  }, [namespace]);

  const dismiss = useCallback(
    (id: number) => {
      setIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        void chrome.storage.local
          .set({ [KEY_PREFIX + namespace]: Array.from(next) })
          .catch(() => {});
        return next;
      });
    },
    [namespace],
  );

  const reset = useCallback(() => {
    setIds(new Set());
    void chrome.storage.local.remove(KEY_PREFIX + namespace).catch(() => {});
  }, [namespace]);

  return { ids, dismiss, reset };
}
