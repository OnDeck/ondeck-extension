import { useEffect, useState } from 'react';
import {
  listAccounts,
  removeAccount,
  switchActiveAccount,
  type StoredAccount,
} from '../../lib/accounts';
import type { Viewer } from '../../lib/github-api';

interface Props {
  activeId: string;
  onSwitch: (viewer: Viewer) => void;
  onAddAccount: () => void;
  onSignOut: () => void;
}

export function AccountSwitcher({ activeId, onSwitch, onAddAccount, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listAccounts().then((list) => {
      if (!cancelled) setAccounts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSwitch = async (id: string) => {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const viewer = await switchActiveAccount(id);
      onSwitch(viewer);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const fallback = await removeAccount(id);
      if (fallback) {
        const viewer: Viewer = {
          id: Number(fallback.id),
          login: fallback.login,
          name: fallback.name,
          avatar_url: fallback.avatar_url,
          html_url: `https://github.com/${fallback.login}`,
        };
        onSwitch(viewer);
      } else if (id === activeId) {
        onSignOut();
      }
      setAccounts(await listAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis"
      >
        Accounts ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-60 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 shadow-lg">
          {error && (
            <div className="mb-2 rounded-md border border-gh-danger-emphasis px-2 py-1 text-[11px] text-gh-danger-emphasis">
              {error}
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSwitch(a.id)}
                  className={
                    'flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] ' +
                    (a.id === activeId
                      ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                      : 'text-gh-fg-default hover:bg-black/20')
                  }
                >
                  <img
                    src={a.avatar_url}
                    alt={a.login}
                    className="h-4 w-4 rounded-full"
                  />
                  <span className="truncate">@{a.login}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${a.login}`}
                  disabled={busy}
                  onClick={() => void handleRemove(a.id)}
                  className="rounded-md px-1 text-[11px] text-gh-fg-muted hover:text-gh-danger-emphasis disabled:opacity-60"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onAddAccount();
            }}
            className="mt-2 w-full rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
