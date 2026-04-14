import { useCallback, useEffect, useState } from 'react';
import {
  addAccount,
  listAccounts,
  removeAccount,
  setActiveAccount,
  type AccountSummary,
} from '../../lib/accounts';
import { getReviewsThisWeek } from '../../lib/analytics';

export function AccountSwitcher() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [reviewsThisWeek, setReviewsThisWeek] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listAccounts();
    setAccounts(list);
    const active = list.find((a) => a.isActive);
    if (active) {
      setReviewsThisWeek(await getReviewsThisWeek(active.id));
    } else {
      setReviewsThisWeek(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = async () => {
    setBusy(true);
    setError(null);
    try {
      await addAccount(token);
      setToken('');
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (id: string) => {
    await setActiveAccount(id);
    await refresh();
  };

  const handleRemove = async (id: string) => {
    await removeAccount(id);
    await refresh();
  };

  return (
    <div className="flex h-full flex-col px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gh-fg-default">Accounts</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          {adding ? 'Cancel' : 'Add account'}
        </button>
      </div>

      <div className="mt-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
        <span className="font-semibold text-gh-fg-default">{reviewsThisWeek}</span>{' '}
        review{reviewsThisWeek === 1 ? '' : 's'} logged this week
      </div>

      <ul className="mt-3 flex-1 overflow-y-auto">
        {accounts.length === 0 && (
          <li className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
            No accounts connected. Add one to get started.
          </li>
        )}
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className={`mb-2 flex items-center gap-3 rounded-md border px-2 py-2 ${
              acc.isActive
                ? 'border-gh-accent-emphasis bg-gh-canvas-subtle'
                : 'border-gh-border-default'
            }`}
          >
            <img
              src={acc.avatar_url}
              alt={acc.login}
              className="h-7 w-7 rounded-full border border-gh-border-default"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-gh-fg-default">
                {acc.name ?? acc.login}
              </div>
              <div className="truncate text-[11px] text-gh-fg-muted">@{acc.login}</div>
            </div>
            {acc.isActive ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gh-accent-emphasis">
                Active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleSwitch(acc.id)}
                className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
              >
                Switch
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleRemove(acc.id)}
              title="Remove account"
              className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3">
          <label className="block">
            <span className="text-[11px] text-gh-fg-muted">
              Personal Access Token for the new account
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 font-mono text-xs text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
            />
          </label>
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void handleAdd()}
            className="mt-2 w-full rounded-md border border-gh-border-default bg-gh-canvas-default px-3 py-1.5 text-xs font-semibold text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add account'}
          </button>
          {error && (
            <div className="mt-2 text-[11px] text-gh-danger-emphasis">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
