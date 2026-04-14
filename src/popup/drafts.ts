// Persist draft reply bodies per notification thread in chrome.storage.local.
// Drafts are preserved across popup opens and cleared once the comment posts.

const DRAFTS_KEY = 'gh_workflow_drafts_v1';

type DraftMap = Record<string, string>;

async function readAll(): Promise<DraftMap> {
  const bag = await chrome.storage.local.get(DRAFTS_KEY);
  return (bag[DRAFTS_KEY] as DraftMap | undefined) ?? {};
}

async function writeAll(next: DraftMap): Promise<void> {
  await chrome.storage.local.set({ [DRAFTS_KEY]: next });
}

export async function loadDraft(threadId: string): Promise<string> {
  const all = await readAll();
  return all[threadId] ?? '';
}

export async function saveDraft(threadId: string, body: string): Promise<void> {
  const all = await readAll();
  if (body.trim().length === 0) {
    delete all[threadId];
  } else {
    all[threadId] = body;
  }
  await writeAll(all);
}

export async function clearDraft(threadId: string): Promise<void> {
  const all = await readAll();
  delete all[threadId];
  await writeAll(all);
}
