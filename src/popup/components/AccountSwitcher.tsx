import { useCallback, useEffect, useState } from 'react';
import {
  addAccountWithToken,
  listAccounts,
  removeAccount,
  switchToAccount,
  type AccountSummary,
} from '../../lib/accounts';

interface Props {
  onActiveChange?: (account: AccountSummary | null) => void;
}

export function AccountSwitcher({ onActiveChange }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await listAccounts();
    setAccounts(next);
    const active = next.find((a) => a.isActive) ?? null;
    onActiveChange?.(active);
  }, [onActiveChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSwitch = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await switchToAccount(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: string) => {
    setBusy(true);
    try {
      await removeAccount(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async () => {
    setBusy(true);
    setError(null);
    try {
      await addAccountWithToken(token);
      setToken('');
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gh-fg-default">Accounts</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          disabled={busy}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {accounts.length === 0 && !adding && (
        <div className="text-[11px] text-gh-fg-muted">No accounts yet.</div>
      )}

      <ul className="flex flex-col gap-1">
        {accounts.map((a) => (
          <li
            key={a.id}
            className={
              'flex items-center gap-2 rounded-md border px-2 py-1 ' +
              (a.isActive ? 'border-gh-accent-emphasis' : 'border-gh-border-default')
            }
          >
            <img
              src={a.viewer.avatar_url}
              alt={a.viewer.login}
              className="h-5 w-5 rounded-full"
            />
            <div className="min-w-0 flex-1 truncate">
              <div className="truncate text-[11px] font-semibold text-gh-fg-default">
                @{a.viewer.login}
              </div>
            </div>
            {!a.isActive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSwitch(a.id)}
                className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
              >
                Switch
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRemove(a.id)}
              className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis disabled:opacity-60"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="flex flex-col gap-1">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 font-mono text-[11px] text-gh-fg-default placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void onAdd()}
            className="rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Add account'}
          </button>
        </div>
      )}

      {error && <div className="text-[11px] text-gh-danger-emphasis">{error}</div>}
    </div>
  );
}
