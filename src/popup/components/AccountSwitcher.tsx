import { useCallback, useEffect, useState } from 'react';
import {
  getActiveAccountId,
  listAccounts,
  removeAccount,
  switchActiveAccount,
  syncActiveAccountFromLegacy,
  type Account,
} from '../../lib/accounts';

interface Props {
  onRequestAddAccount: () => void;
  onActiveChanged: () => void;
}

export function AccountSwitcher({ onRequestAddAccount, onActiveChanged }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    await syncActiveAccountFromLegacy();
    const [list, active] = await Promise.all([listAccounts(), getActiveAccountId()]);
    setAccounts(list);
    setActiveId(active);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSwitch = async (id: string) => {
    if (id === activeId) return;
    setBusy(true);
    try {
      await switchActiveAccount(id);
      await refresh();
      onActiveChanged();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    try {
      await removeAccount(id);
      await refresh();
      onActiveChanged();
    } finally {
      setBusy(false);
    }
  };

  const active = accounts.find((a) => a.id === activeId) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
      >
        {active ? `@${active.viewer.login}` : 'Accounts'} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-1 shadow-lg">
          {accounts.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-gh-fg-muted">
              No accounts yet.
            </div>
          )}
          {accounts.map((a) => {
            const isActive = a.id === activeId;
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gh-canvas-default"
              >
                <img
                  src={a.viewer.avatar_url}
                  alt={a.viewer.login}
                  className="h-6 w-6 rounded-full border border-gh-border-muted"
                />
                <button
                  type="button"
                  onClick={() => void handleSwitch(a.id)}
                  disabled={busy}
                  className="min-w-0 flex-1 truncate text-left text-[11px] text-gh-fg-default"
                >
                  @{a.viewer.login}
                  {isActive && (
                    <span className="ml-1 text-[10px] text-gh-success-emphasis">
                      active
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(a.id)}
                  disabled={busy}
                  aria-label={`Remove ${a.viewer.login}`}
                  className="rounded-md border border-gh-border-muted px-1 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRequestAddAccount();
            }}
            className="mt-1 w-full rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
