import { useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  onSwitch: (id: number) => void;
  onRemove: (id: number) => void;
  onAdd: (token: string) => Promise<void>;
}

export function AccountSwitcher({ accounts, onSwitch, onRemove, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(token);
      setToken('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-gh-border-default px-4 py-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
          Accounts
        </h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          {open ? 'Cancel' : 'Add account'}
        </button>
      </header>

      {accounts.length === 0 && (
        <p className="mt-2 text-[11px] text-gh-fg-muted">
          No accounts connected. Add a Personal Access Token to get started.
        </p>
      )}

      {accounts.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {accounts.map((a) => (
            <li key={a.id}>
              <div
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                  a.active
                    ? 'border-gh-accent-emphasis bg-gh-canvas-subtle'
                    : 'border-transparent hover:border-gh-border-default hover:bg-gh-canvas-subtle'
                }`}
              >
                <img
                  src={a.avatar_url}
                  alt={a.login}
                  className="h-6 w-6 shrink-0 rounded-full border border-gh-border-default"
                />
                <button
                  type="button"
                  onClick={() => !a.active && onSwitch(a.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-xs font-semibold text-gh-fg-default">
                    {a.name ?? a.login}
                  </div>
                  <div className="truncate text-[10px] text-gh-fg-muted">
                    @{a.login}
                  </div>
                </button>
                {a.active && (
                  <span className="rounded-full border border-gh-accent-emphasis px-1.5 py-0.5 text-[9px] font-semibold text-gh-accent-emphasis">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  title="Remove account"
                  className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            spellCheck={false}
            className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5 font-mono text-xs text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
          />
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void handleAdd()}
            className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] font-semibold text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Add account'}
          </button>
          {error && (
            <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-danger-emphasis">
              {error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
