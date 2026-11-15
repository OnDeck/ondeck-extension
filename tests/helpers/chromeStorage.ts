// Minimal in-memory chrome.storage area: enough for get/set/remove with a
// string, string[] or undefined key argument.
export function memoryStorageArea() {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: async (keys?: string | string[]) => {
      if (keys === undefined) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(data, structuredClone(items));
    },
    remove: async (keys: string | string[]) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
    },
    clear() {
      for (const k of Object.keys(data)) delete data[k];
    },
  };
}
