import { useEffect, useState } from 'react';
import {
  addAccount,
  listAccounts,
  removeAccount,
  switchAccount,
  type AccountSummary,
} from '../../lib/accounts';

interface Props {
  onActiveChanged?: (account: AccountSummary | null) => void;
}

export function AccountSwitcher({ onActiveChanged }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const next = await listAccounts();
    setAccounts(next);
    onActiveChanged?.(next.find((a) => a.isActive) ?? null);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    setBusy(true);
    setError(null);
    try {
      await addAccount(token);
      setToken('');
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add account');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (id: string) => {
    setBusy(true);
    try {
      await switchAccount(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    try {
      await removeAccount(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-gh-border-default">
      <header className="flex items-center justify-between px-4 py-2">
        <h2 className="text-xs font-semibold">Accounts</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis"
        >
          {adding ? 'Cancel' : 'Add account'}
        </button>
      </header>

      {accounts.length === 0 && !adding && (
        <p className="px-4 pb-3 text-[11px] text-gh-fg-muted">
          No accounts yet. Add one to get started.
        </p>
      )}

      <ul>
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className={`flex items-center gap-2 px-4 py-2 text-xs ${
              acc.isActive ? 'bg-gh-canvas-subtle' : ''
            }`}
          >
            <img
              src={acc.avatarUrl}
              alt={acc.login}
              className="h-6 w-6 rounded-full border border-gh-border-default"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-gh-fg-default">
                {acc.name ?? acc.login}
              </div>
              <div className="truncate text-[11px] text-gh-fg-muted">@{acc.login}</div>
            </div>
            {acc.isActive ? (
              <span className="rounded-md border border-gh-success-emphasis px-1.5 py-0.5 text-[10px] font-semibold text-gh-success-emphasis">
                Active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleSwitch(acc.id)}
                disabled={busy}
                className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
              >
                Switch
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleRemove(acc.id)}
              disabled={busy}
              className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis disabled:opacity-60"
              title="Remove account"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="border-t border-gh-border-muted px-4 py-2">
          <label className="block text-[11px] font-semibold text-gh-fg-muted">
            Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5 font-mono text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={busy || !token.trim()}
            className="mt-2 w-full rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-1 text-[11px] font-semibold text-gh-fg-on-emphasis hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Add account'}
          </button>
          {error && (
            <p className="mt-2 text-[11px] text-gh-danger-emphasis">{error}</p>
          )}
        </div>
      )}
    </section>
  );
}
